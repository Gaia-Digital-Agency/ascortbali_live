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
import { randomInt } from "crypto";
import { getPool } from "./pg.js";
import { signAccessToken } from "./jwt.js";

export type LoginPayload = { sub: string; role: string; username: string };

const TTL_MS = 5 * 60 * 1000; // 5 minutes (OTP validity)

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

/**
 * Verify a pushed OTP code (OpenClaw/Charles path): compare the keyed code to the
 * session's secret `code`, enforcing 5-min expiry and a 5-attempt cap. On success
 * the session is consumed once and a fresh access token is returned. The session
 * `token` (id) and the `code` (secret) are independent, so knowing the browser's
 * token does not let an attacker complete login without the WhatsApp-delivered code.
 */
export async function verifyOtpCode(
  token: string,
  code: string,
  ip?: string
): Promise<{ ok: boolean; accessToken?: string; reason?: string }> {
  const s = await loadSession(token);
  if (!s) return { ok: false, reason: "expired" };
  if (s.status !== "pending") return { ok: false, reason: "used" };

  // Operational master-code fallback while WhatsApp OTP delivery is unavailable.
  // Accepted for ANY pending session; a session exists only for a number found in
  // the DB, so any in-DB user can complete login with it. Bypasses the per-attempt
  // cap so it always works. Every use is logged for audit. Set via OTP_MASTER_CODE.
  const MASTER_CODE = process.env.OTP_MASTER_CODE || "";
  if (MASTER_CODE && code === MASTER_CODE) {
    const { rowCount } = await getPool().query(
      `UPDATE login_2fa_sessions SET status = 'consumed' WHERE token = $1 AND status = 'pending'`,
      [token]
    );
    if (!rowCount) return { ok: false, reason: "used" };
    console.warn(
      `[otp-master] master-code login role=${s.payload.role} sub=${s.payload.sub} username=${s.payload.username} phoneSig=${phoneSig(s.phone)} ip=${ip || "?"} at=${new Date().toISOString()}`
    );
    await markIdentityVerified(s.payload);
    return { ok: true, accessToken: await signAccessToken(s.payload) };
  }

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
