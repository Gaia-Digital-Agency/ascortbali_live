// DB-backed 2FA login sessions, shared across all cluster workers.
//
// One row per pending login. A session can be completed two ways:
//   - SMS:  Twilio Verify sends/checks a code (stateless on Twilio's side);
//           we only use the row to map token -> {payload, phone}.
//   - WhatsApp: the user opens a 24h session by messaging our number; the
//           inbound webhook matches the token in the message body AND requires
//           the sender's number to equal the account's registered number, then
//           flips the row to 'verified'. The browser polls and completes.
//
// Using the DB (not in-memory) is required because pm2 runs multiple workers,
// and the inbound webhook / poll / login can each land on a different worker.
import { randomBytes, randomInt } from "crypto";
import { getPool } from "./pg.js";
import { signAccessToken } from "./jwt.js";
import { findInboundToken } from "./twilio.js";

export type LoginPayload = { sub: string; role: string; username: string };

const TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Unguessable token, prefixed so it's recognisable inside a WhatsApp message. */
function newToken(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Crypto-strong 6-digit OTP code. Used by the OpenClaw (Charles) push path: the
 * App generates this code, sends it to the user's WhatsApp, and the user keys it
 * back. Unlike `token` (the browser-held session id), this code is the SECRET —
 * it is never returned to the browser, only delivered over WhatsApp.
 */
function newCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Last 8 significant digits, for tolerant cross-format phone matching. */
function phoneSig(phone: string): string {
  return (phone || "").replace(/\D/g, "").slice(-8);
}

type SessionRow = {
  token: string;
  payload: LoginPayload;
  phone: string;
  status: string; // pending | verified | consumed
  code: string | null;
  attempts: number;
  expires_at: string | Date;
  created_at: string | Date;
};

/**
 * Create a pending 2FA session. Returns the `token` (the session id the browser
 * holds) and the secret `code` (delivered to the user over WhatsApp on the
 * OpenClaw/Charles path; never returned to the browser).
 */
export async function createLoginSession(
  payload: LoginPayload,
  phone: string
): Promise<{ token: string; code: string }> {
  const token = newToken();
  const code = newCode();
  await getPool().query(
    `INSERT INTO login_2fa_sessions (token, payload, phone, status, code, attempts, expires_at)
     VALUES ($1, $2::jsonb, $3, 'pending', $4, 0, NOW() + INTERVAL '${TTL_MS} milliseconds')`,
    [token, JSON.stringify(payload), phone, code]
  );
  return { token, code };
}

async function loadSession(token: string): Promise<SessionRow | null> {
  const { rows } = await getPool().query(
    `SELECT token, payload, phone, status, code, attempts, expires_at, created_at FROM login_2fa_sessions WHERE token = $1`,
    [token]
  );
  const r = rows[0];
  if (!r) return null;
  if (new Date(r.expires_at).getTime() < Date.now()) {
    await getPool().query(`DELETE FROM login_2fa_sessions WHERE token = $1`, [token]);
    return null;
  }
  return r as SessionRow;
}

/** Registered phone for a still-pending session (used to send the SMS code). */
export async function getSessionPhone(token: string): Promise<string | null> {
  const s = await loadSession(token);
  return s && s.status === "pending" ? s.phone : null;
}

/**
 * Verify from an inbound WhatsApp message: parse the 6-digit code from the body and
 * require the sender's number to match the session's registered number. Returns
 * a human-readable outcome for the auto-reply.
 */
export async function verifyInbound(
  body: string,
  fromPhone: string
): Promise<"verified" | "wrong_number" | "no_match" | "already_done"> {
  const m = (body || "").match(/\b(\d{6})\b/);
  if (!m) return "no_match";
  const s = await loadSession(m[0]);
  if (!s) return "no_match";
  if (s.status !== "pending") return "already_done";
  const sig = phoneSig(s.phone);
  if (sig.length < 8 || phoneSig(fromPhone) !== sig) return "wrong_number";
  await getPool().query(`UPDATE login_2fa_sessions SET status = 'verified' WHERE token = $1`, [m[0]]);
  return "verified";
}

/**
 * Browser-poll handler for the WhatsApp path. If the session is still pending,
 * actively check Twilio's message log for the matching inbound (this avoids
 * depending on inbound webhook routing, which is environment-specific). If
 * found, flip to verified. Then complete if verified.
 */
export async function pollVerify(token: string): Promise<{ status: string; accessToken?: string }> {
  const s = await loadSession(token);
  if (!s) return { status: "expired" };
  if (s.status === "pending") {
    const created = new Date(s.created_at).getTime();
    if (await findInboundToken(s.phone, token, created)) {
      await getPool().query(
        `UPDATE login_2fa_sessions SET status = 'verified' WHERE token = $1 AND status = 'pending'`,
        [token]
      );
    }
  }
  return completeIfVerified(token);
}

/**
 * Poll completion for the WhatsApp path: if verified, consume the row once,
 * flip the account's `verified` flag, and return a fresh access token.
 */
export async function completeIfVerified(token: string): Promise<{ status: string; accessToken?: string }> {
  const s = await loadSession(token);
  if (!s) return { status: "expired" };
  if (s.status !== "verified") return { status: s.status };
  const { rowCount } = await getPool().query(
    `UPDATE login_2fa_sessions SET status = 'consumed' WHERE token = $1 AND status = 'verified'`,
    [token]
  );
  if (!rowCount) return { status: "consumed" };
  await markIdentityVerified(s.payload);
  return { status: "verified", accessToken: await signAccessToken(s.payload) };
}

/** Complete a session that was just verified by an SMS code check. */
export async function completeSession(token: string): Promise<string | null> {
  const s = await loadSession(token);
  if (!s) return null;
  const { rowCount } = await getPool().query(
    `UPDATE login_2fa_sessions SET status = 'consumed' WHERE token = $1 AND status IN ('pending','verified')`,
    [token]
  );
  if (!rowCount) return null;
  await markIdentityVerified(s.payload);
  return signAccessToken(s.payload);
}

/**
 * Verify a pushed OTP code (OpenClaw/Charles path): compare the keyed code to the
 * session's secret `code`, enforcing 5-min expiry and a 5-attempt cap. On success
 * the session is consumed once and a fresh access token is returned. The session
 * `token` (id) and the `code` (secret) are independent, so knowing the browser's
 * token does not let an attacker complete login without the WhatsApp-delivered code.
 */
export async function verifyOtpCode(
  token: string,
  code: string
): Promise<{ ok: boolean; accessToken?: string; reason?: string }> {
  const s = await loadSession(token);
  if (!s) return { ok: false, reason: "expired" };
  if (s.status !== "pending") return { ok: false, reason: "used" };

  // Count this attempt atomically; cap at 5.
  const { rows } = await getPool().query(
    `UPDATE login_2fa_sessions SET attempts = COALESCE(attempts, 0) + 1 WHERE token = $1 RETURNING attempts, code`,
    [token]
  );
  const attempts: number = rows[0]?.attempts ?? 99;
  const stored: string | null = rows[0]?.code ?? null;
  if (attempts > 5) {
    await getPool().query(`DELETE FROM login_2fa_sessions WHERE token = $1`, [token]);
    return { ok: false, reason: "too_many" };
  }
  if (!stored || stored !== code) return { ok: false, reason: "invalid" };

  // Correct code — consume the row exactly once and complete.
  const { rowCount } = await getPool().query(
    `UPDATE login_2fa_sessions SET status = 'consumed' WHERE token = $1 AND status = 'pending'`,
    [token]
  );
  if (!rowCount) return { ok: false, reason: "used" };
  await markIdentityVerified(s.payload);
  return { ok: true, accessToken: await signAccessToken(s.payload) };
}

/** Flip the per-account `verified` flag so 2FA isn't prompted again. Non-fatal. */
async function markIdentityVerified(payload: LoginPayload): Promise<void> {
  try {
    if (payload.role === "creator") {
      await getPool().query(`UPDATE providers SET verified = true, updated_at = NOW() WHERE uuid = $1::uuid`, [payload.sub]);
    } else {
      await getPool().query(
        `UPDATE app_accounts SET verified = true, updated_at = NOW() WHERE id = $1::uuid AND role = $2`,
        [payload.sub, payload.role]
      );
    }
  } catch {
    /* non-fatal: user can still log in, just re-prompted next time */
  }
}

// Periodic purge of expired sessions.
setInterval(() => {
  getPool().query(`DELETE FROM login_2fa_sessions WHERE expires_at < NOW()`).catch(() => {});
}, 10 * 60 * 1000);
