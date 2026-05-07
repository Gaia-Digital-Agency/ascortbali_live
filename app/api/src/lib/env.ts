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
});

// Parse and export the environment variables.
export const env = EnvSchema.parse(process.env);
