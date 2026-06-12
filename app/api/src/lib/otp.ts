// In-memory OTP store for 2FA.
// Each pending login gets a random ID, a 6-digit code (used only on the
// self-managed WhatsApp path), and the user payload needed to issue tokens.
import { randomUUID, randomInt } from "crypto";
import { isVerifyConfigured, checkVerification } from "./twilio.js";

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

/** Verify an OTP code. Returns the user payload and verified phone on success, or null on failure. */
export function verifyOtp(
  sessionId: string,
  code: string
): { payload: PendingLogin["payload"]; phone: string } | null {
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
  return { payload: entry.payload, phone: entry.phone };
}

/**
 * Verify a code for a session. When Twilio Verify is configured, the code is
 * checked by Twilio (we only keep the session→payload mapping here, and still
 * enforce local expiry + attempt limits); otherwise it falls back to the
 * self-managed code comparison in verifyOtp. Returns the payload + phone on
 * success, or null on failure.
 */
export async function checkOtp(
  sessionId: string,
  code: string
): Promise<{ payload: PendingLogin["payload"]; phone: string } | null> {
  if (!isVerifyConfigured()) return verifyOtp(sessionId, code);

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

  const ok = await checkVerification(entry.phone, code);
  if (!ok) return null;

  // Success — clean up
  store.delete(sessionId);
  return { payload: entry.payload, phone: entry.phone };
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
