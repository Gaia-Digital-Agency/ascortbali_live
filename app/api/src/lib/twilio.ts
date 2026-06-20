// Twilio messaging for 2FA OTP delivery (Twilio Verify, or WhatsApp fallback).
import Twilio from "twilio";
import { env } from "./env.js";
import { sendWhatsApp } from "./openclaw.js";
import { createOtp, verifyOtp } from "./otp.js";
import { getPool } from "./pg.js";

/** Normalise a stored phone to bare E.164 (strip any "whatsapp:" prefix). */
function toE164(phone: string): string {
  return phone.replace(/^whatsapp:/, "").trim();
}

let client: ReturnType<typeof Twilio> | null = null;

function getClient() {
  if (!client) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }
    client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Whether Twilio Verify is configured. This is the preferred OTP path: Twilio
 * owns code generation, delivery, and checking, using its own pre-approved
 * templates — so it needs no WhatsApp Business template or WABA of our own.
 */
export function isVerifyConfigured(): boolean {
  return (
    !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_VERIFY_SERVICE_SID
  );
}

/** Check if 2FA is enabled and a delivery mechanism (Verify or WhatsApp) is configured. */
export function isOpenClawConfigured(): boolean {
  return env.OPENCLAW_OTP_ENABLED === true;
}

export function is2FAEnabled(): boolean {
  if (env.WHATSAPP_2FA_ENABLED !== true) return false;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return false;
  return isVerifyConfigured() || !!env.TWILIO_WHATSAPP_FROM;
}

/** Whether WhatsApp sending is configured (creds + sender), regardless of the 2FA toggle. */
export function isWhatsAppConfigured(): boolean {
  return !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_WHATSAPP_FROM;
}

/**
 * Send the creator onboarding invite. Login is now passwordless (by WhatsApp
 * number), so the invite simply points the creator to the normal login page;
 * the `tempPassword` argument is accepted for call-site compatibility but no
 * longer used. If TWILIO_ONBOARDING_CONTENT_SID is set, the approved WhatsApp
 * template is used; otherwise a freeform body is sent (24h window).
 * Template variable: {{1}} = login URL.
 */
export async function sendOnboardingInvite(phone: string, _tempPassword?: string, creatorId?: string): Promise<void> {
  const tw = getClient();
  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  const from = env.TWILIO_WHATSAPP_FROM!;
  const url = `${env.PUBLIC_SITE_URL.replace(/\/+$/, "")}/creator`;
  const statusCallback = `${env.PUBLIC_SITE_URL.replace(/\/+$/, "")}/auth/twilio/invite-status`;

  if (env.TWILIO_ONBOARDING_CONTENT_SID) {
    const msg = await tw.messages.create({
      to,
      from,
      contentSid: env.TWILIO_ONBOARDING_CONTENT_SID,
      contentVariables: JSON.stringify({ "1": url }),
      statusCallback,
    });
    if (creatorId && msg.sid) {
      const pool = getPool();
      await pool.query(
        `INSERT INTO invite_tracking (creator_uuid, message_sid, status) VALUES ($1::uuid, $2, $3)`,
        [creatorId, msg.sid, msg.status || "queued"]
      );
    }
    return;
  }

  const msg = await tw.messages.create({
    to,
    from,
    statusCallback,
    body:
      `You are beautiful and in another life I would be lucky to be with you. In this life I have found someone special.

Free listing.
${url}

I've matched with many beautiful and interesting people that I had my advertising agency build a website for Bali escorts, freelancers, and sugar babies.

I will send FREE registration to my database of 45,000 male friends and clients as well as advertise the site.

They'll all love you and be excited to meet you for your amazing beauty, services and sugar.

Please sign in with your WhatsApp number through the "Girls Zone" to check your profile and add pictures and more profile details

${url}`,
  });
  if (creatorId && msg.sid) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO invite_tracking (creator_uuid, message_sid, status) VALUES ($1::uuid, $2, $3)`,
      [creatorId, msg.sid, msg.status || "queued"]
    );
  }
}

/**
 * Send a WhatsApp OTP message. Phone must include country code (e.g. "+628123456789").
 * If TWILIO_OTP_CONTENT_SID is set, sends the approved authentication template
 * (required for production business-initiated messages); otherwise sends a
 * freeform body (sandbox / 24h window only). Template variable: {{1}} = code.
 */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const tw = getClient();
  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  const from = env.TWILIO_WHATSAPP_FROM!;

  if (env.TWILIO_OTP_CONTENT_SID) {
    await tw.messages.create({
      to,
      from,
      contentSid: env.TWILIO_OTP_CONTENT_SID,
      contentVariables: JSON.stringify({ "1": code }),
    });
    return;
  }

  await tw.messages.create({
    to,
    from,
    body: `Code expires in 5 minutes and do not share code with anyone. Your BG OTP is: ${code}`,
  });
}

/**
 * Start an OTP verification via Twilio Verify. Twilio generates and sends the
 * code itself (no code argument). Channel defaults to SMS, which works
 * regardless of WhatsApp/WABA status; set TWILIO_VERIFY_CHANNEL=whatsapp to use
 * WhatsApp once a healthy sender is connected.
 */
export async function startVerification(phone: string): Promise<void> {
  const tw = getClient();
  const channel = (env.TWILIO_VERIFY_CHANNEL || "sms").toLowerCase();
  await tw.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: toE164(phone), channel });
}

/**
 * Check an OTP code against Twilio Verify. Returns true only when Twilio reports
 * the verification as "approved". Swallows Twilio errors (e.g. expired / no
 * pending verification / 404) and returns false so callers treat them as a
 * failed attempt.
 */
export async function checkVerification(phone: string, code: string): Promise<boolean> {
  const tw = getClient();
  try {
    const check = await tw.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: toE164(phone), code });
    return check.status === "approved";
  } catch {
    return false;
  }
}

/**
 * Deliver an OTP using the configured mechanism: Twilio Verify when configured
 * (preferred — ignores `legacyCode`, Twilio sends its own), else the
 * self-managed WhatsApp message using the provided code.
 */
export async function deliverOtp(phone: string, legacyCode: string): Promise<void> {
  // OpenClaw path: send via OpenClaw WhatsApp gateway (avoids Meta WABA)
  if (isOpenClawConfigured()) {
    const { sessionId, code } = createOtp(
      { sub: "pending", role: "user", username: "" },
      phone
    );
    const msg = `Bali Girls - Your OTP code is: ${code}. It expires in 5 minutes. Do not share this code with anyone.`;
    const result = await sendWhatsApp(phone, msg);
    if (!result.ok) {
      console.error("[openclaw] deliverOtp failed:", result.error);
      // Fall through to Twilio path
    } else {
      return;
    }
  }
  if (isVerifyConfigured()) {
    await startVerification(phone);
    return;
  }
  await sendWhatsAppOtp(phone, legacyCode);
}

/**
 * Poll Twilio's message log for an inbound WhatsApp message to our number, from
 * `fromPhone`, sent after `sinceMs`, whose body contains `token`. Used by the
 * "click to WhatsApp" login flow instead of relying on inbound webhook routing
 * (which is environment-dependent). Phone match is tolerant (last 8 digits).
 */
export async function findInboundToken(fromPhone: string, token: string, sinceMs: number): Promise<boolean> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return false;
  const tw = getClient();
  const to = `whatsapp:${env.WHATSAPP_INBOUND_NUMBER}`;
  const sig = fromPhone.replace(/\D/g, "").slice(-8);
  const needle = token.toUpperCase();
  // The token is unique + unguessable, so token+sender match is sufficient; the
  // time window is only to bound the query. Use a generous floor (15 min, or
  // session-creation minus skew) to tolerate clock differences.
  const floor = Math.min(sinceMs - 60_000, Date.now() - 15 * 60_000);
  try {
    const msgs = await tw.messages.list({ to, dateSentAfter: new Date(floor), limit: 30 });
    return msgs.some(
      (m) =>
        (m.direction || "").startsWith("inbound") &&
        (m.from || "").replace(/\D/g, "").slice(-8) === sig &&
        sig.length === 8 &&
        (m.body || "").toUpperCase().includes(needle)
    );
  } catch {
    return false;
  }
}
