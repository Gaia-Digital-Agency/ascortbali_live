// Twilio WhatsApp messaging for 2FA OTP delivery.
import Twilio from "twilio";
import { env } from "./env.js";

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

/** Check if WhatsApp 2FA is fully configured and enabled. */
export function is2FAEnabled(): boolean {
  return (
    env.WHATSAPP_2FA_ENABLED === true &&
    !!env.TWILIO_ACCOUNT_SID &&
    !!env.TWILIO_AUTH_TOKEN &&
    !!env.TWILIO_WHATSAPP_FROM
  );
}

/** Whether WhatsApp sending is configured (creds + sender), regardless of the 2FA toggle. */
export function isWhatsAppConfigured(): boolean {
  return !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_WHATSAPP_FROM;
}

/**
 * Send the creator onboarding invite: the initial-login link plus the creator's
 * temp password (their mobile number). If TWILIO_ONBOARDING_CONTENT_SID is set,
 * the approved WhatsApp template is used (required for production business-
 * initiated messages); otherwise a freeform body is sent (sandbox / 24h window).
 * Template variables: {{1}} = login URL, {{2}} = temp password.
 */
export async function sendOnboardingInvite(phone: string, tempPassword: string): Promise<void> {
  const tw = getClient();
  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  const from = env.TWILIO_WHATSAPP_FROM!;
  const url = `${env.PUBLIC_SITE_URL.replace(/\/+$/, "")}/creator/initial-login`;

  if (env.TWILIO_ONBOARDING_CONTENT_SID) {
    await tw.messages.create({
      to,
      from,
      contentSid: env.TWILIO_ONBOARDING_CONTENT_SID,
      contentVariables: JSON.stringify({ "1": url, "2": tempPassword }),
    });
    return;
  }

  await tw.messages.create({
    to,
    from,
    body:
      `Welcome to Bali Girls! Please visit ${url} to verify your login and ` +
      `begin using the site. Log in with your mobile number as your temporary ` +
      `password: ${tempPassword}`,
  });
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
    body: `Your Bali Girls verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
  });
}
