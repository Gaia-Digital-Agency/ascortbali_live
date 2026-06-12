// This module defines and validates environment variables using Zod.
import { z } from "zod";

// Zod schema for environment variables.
const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),

  // JWT configuration.
  JWT_ISSUER: z.string(),
  JWT_AUDIENCE: z.string(),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().default(2592000),

  // JWT signing keys.
  JWT_PRIVATE_KEY_PEM: z.string(),
  JWT_PUBLIC_KEY_PEM: z.string(),

  // Analytics HMAC secret.
  ANALYTICS_HMAC_SECRET: z.string().min(16),
  // CORS origin.
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // WhatsApp 2FA (Twilio). All optional — 2FA is disabled when any value is missing.
  // NOTE: do NOT use z.coerce.boolean() here — it does Boolean(value), and any
  // non-empty string (including "false") coerces to `true`. Parse explicitly.
  WHATSAPP_2FA_ENABLED: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null) return false;
      const s = v.trim().toLowerCase();
      return s === "true" || s === "1" || s === "yes" || s === "on";
    }),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(), // e.g. "whatsapp:+14155238886"
  // Approved WhatsApp template (Content SID, "HX…") for the creator onboarding
  // invite. Required for production business-initiated sends; when unset the
  // onboarding invite falls back to a freeform body (sandbox / 24h window only).
  TWILIO_ONBOARDING_CONTENT_SID: z.string().optional(),
  // Approved WhatsApp *authentication* template (Content SID, "HX…") for the
  // 2FA OTP. Required for production business-initiated sends; when unset the
  // OTP falls back to a freeform body (sandbox / 24h window only).
  TWILIO_OTP_CONTENT_SID: z.string().optional(),
  // Twilio Verify service ("VA…"). Preferred OTP path: Twilio generates, sends,
  // and checks the code using its own pre-approved templates, so it needs no
  // WhatsApp Business template/WABA of our own. When set, it takes precedence
  // over the self-managed code + TWILIO_WHATSAPP_FROM path.
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  // Channel Verify uses to deliver the OTP: "sms" (default), "whatsapp", or "call".
  // SMS works regardless of WhatsApp/WABA status; switch to "whatsapp" once a
  // healthy WhatsApp sender is connected.
  TWILIO_VERIFY_CHANNEL: z.string().optional(),
  // WhatsApp number (E.164, with +) users message to verify via the "click to
  // WhatsApp" flow. This is the real connected sender (not the sandbox). The
  // login response hands it to the browser to build the wa.me deep link.
  WHATSAPP_INBOUND_NUMBER: z.string().default("+17407628065"),

  // Public site origin used to build links in outbound messages (no trailing slash).
  PUBLIC_SITE_URL: z.string().default("https://baligirls.gaiada2.online"),
});

// Parse and export the environment variables.
export const env = EnvSchema.parse(process.env);
