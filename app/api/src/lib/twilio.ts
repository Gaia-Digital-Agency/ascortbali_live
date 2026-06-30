// Twilio messaging for 2FA OTP delivery (Twilio Verify, or WhatsApp fallback).
import Twilio from "twilio";
import { env } from "./env.js";
import { getPool } from "./pg.js";

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

// ── WhatsApp OTP via Twilio subaccount + approved authentication template ──
// The OTP WhatsApp sender lives on a separate Twilio subaccount whose WhatsApp
// Business Account is verified, so authentication templates are permitted. We
// authenticate with the subaccount's own credentials and send the approved
// content template, passing the 6-digit code as variable {{1}}.
let otpClient: ReturnType<typeof Twilio> | null = null;

function getOtpClient() {
  const sid = env.TWILIO_OTP_SUBACCOUNT_SID;
  const tok = env.TWILIO_OTP_SUBACCOUNT_AUTH_TOKEN;
  if (!sid || !tok) throw new Error("Twilio OTP subaccount credentials not configured");
  if (!otpClient) otpClient = Twilio(sid, tok);
  return otpClient;
}

/** Whether the Twilio WhatsApp OTP-template path is fully configured. */
export function isWhatsAppOtpConfigured(): boolean {
  return (
    !!env.TWILIO_OTP_SUBACCOUNT_SID &&
    !!env.TWILIO_OTP_SUBACCOUNT_AUTH_TOKEN &&
    !!env.TWILIO_OTP_WHATSAPP_FROM &&
    !!env.TWILIO_OTP_CONTENT_SID
  );
}

/**
 * Send a login OTP over WhatsApp using the approved authentication template.
 * `code` is the 6-digit code the app generated (and will verify); it is passed
 * as template variable {{1}}. Returns {ok} so the caller can fall back to SMS
 * on failure.
 */
export async function sendWhatsAppOtpTemplate(
  phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const tw = getOtpClient();
    const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
    await tw.messages.create({
      from: env.TWILIO_OTP_WHATSAPP_FROM!,
      to,
      contentSid: env.TWILIO_OTP_CONTENT_SID!,
      contentVariables: JSON.stringify({ "1": code }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Fallback: deliver the same OTP code over plain SMS from the OTP subaccount's
 * number (the WhatsApp sender number is SMS-capable). Used when the WhatsApp
 * template send fails (e.g. the recipient can't receive WhatsApp).
 */
export async function sendSmsOtp(
  phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const from = (env.TWILIO_OTP_WHATSAPP_FROM || "").replace(/^whatsapp:/, "").trim();
    if (!from) return { ok: false, error: "SMS sender not configured" };
    const tw = getOtpClient();
    await tw.messages.create({
      from,
      to: phone.replace(/^whatsapp:/, "").trim(),
      body: `Your Bali Girls verification code is ${code}. It is valid for 5 minutes. Do not share it with anyone.`,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Deliver the login OTP: WhatsApp template first, falling back to SMS if the
 * WhatsApp send fails. Returns which method actually delivered (for UI copy).
 */
export async function sendOtpWaThenSms(
  phone: string,
  code: string
): Promise<{ ok: boolean; method: "whatsapp" | "sms"; error?: string }> {
  const wa = await sendWhatsAppOtpTemplate(phone, code);
  if (wa.ok) return { ok: true, method: "whatsapp" };
  console.warn(`[otp] WhatsApp send failed (${wa.error}); falling back to SMS`);
  const sms = await sendSmsOtp(phone, code);
  if (sms.ok) return { ok: true, method: "sms" };
  return { ok: false, method: "sms", error: sms.error || wa.error };
}

/** Whether 2FA login is enabled and the OTP delivery path is configured. */
export function is2FAEnabled(): boolean {
  return env.WHATSAPP_2FA_ENABLED === true && isWhatsAppOtpConfigured();
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
