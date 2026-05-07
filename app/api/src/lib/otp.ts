// In-memory OTP store for WhatsApp 2FA.
// Each pending login gets a random ID, a 6-digit code, and the user payload needed to issue tokens.
import { randomUUID, randomInt } from "crypto";

export type PendingLogin = {
  code: string;
  expiresAt: number;
  attempts: number;
  payload: { sub: string; role: string; username: string };
  phone: string; // whatsapp number to send OTP to
};

const store = new Map<string, PendingLogin>();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

/** Generate a 6-digit OTP and store a pending login session. Returns the session ID and code. */
export function createOtp(payload: PendingLogin["payload"], phone: string): { sessionId: string; code: string } {
  const sessionId = randomUUID();
  const code = String(randomInt(100000, 999999));
  store.set(sessionId, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    payload,
    phone,
  });
  return { sessionId, code };
}

/** Verify an OTP code. Returns the user payload on success, or null on failure. */
export function verifyOtp(sessionId: string, code: string): PendingLogin["payload"] | null {
  const entry = store.get(sessionId);
  if (!entry) return null;

  // Expired
  if (Date.now() > entry.expiresAt) {
    store.delete(sessionId);
    return null;
  }

  // Too many attempts
  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(sessionId);
    return null;
  }

  if (entry.code !== code) return null;

  // Success — clean up
  store.delete(sessionId);
  return entry.payload;
}

/** Get a pending login by session ID (e.g. to resend the OTP). */
export function getPendingLogin(sessionId: string): PendingLogin | null {
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(sessionId);
    return null;
  }
  return entry;
}

/** Periodically purge expired entries (runs every 10 minutes). */
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now > entry.expiresAt) store.delete(id);
  }
}, 10 * 60 * 1000);
