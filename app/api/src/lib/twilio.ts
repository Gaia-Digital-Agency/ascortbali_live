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

/** Send a WhatsApp OTP message. Phone must include country code (e.g. "+628123456789"). */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const tw = getClient();
  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  const from = env.TWILIO_WHATSAPP_FROM!;

  await tw.messages.create({
    to,
    from,
    body: `Your Bali Girls verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
  });
}
