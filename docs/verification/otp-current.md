# Login OTP — current state (Twilio WhatsApp + SMS fallback)

_Last updated 2026-07-01. This is the source of truth for how Bali Girls login OTP works._

## Summary
User/creator login is passwordless: the account is identified by its WhatsApp number, then a
6-digit OTP confirms control of that number. The OTP is delivered by **Twilio WhatsApp** using an
**approved authentication template**, with an automatic **plain-SMS fallback** if the WhatsApp
send fails. The App generates and verifies the code itself (Twilio is delivery-only).

The earlier **OpenClaw "Charles"** unofficial-WhatsApp relay is **decommissioned** (see bottom).

## Twilio setup
- **Parent account:** `gaiada_ascortbali`.
- **OTP subaccount:** `Baligirls WhatsApp OTP` = `AC…cf1`. Holds the
  OTP sender so it can sit on a *verified-business* WABA (authentication templates require this).
- **WhatsApp sender:** `+1 659-257-5475` (SMS-capable; the SMS fallback sends from the same number).
- **WABA:** `2099451430940742` (`Baligirls_Main`), owned by the Meta business **AG Alchemy**
  (portfolio `2269103523626526`), which is **Meta-Business-Verified** — this is what unlocks
  authentication-template creation. (A WABA must be on a verified business or Meta returns
  error `2388185`.)
- **Approved auth template:** `HX7e77778694040c69ad3c4e208ba31bd4` ("baligirls_otp", en). The
  6-digit code is passed as template variable `{{1}}`.
- **Credentials** live in `gda-pn01:/var/www/baligirls/app/api/.env` (and `secret.txt`,
  gitignored): `TWILIO_OTP_SUBACCOUNT_SID`, `TWILIO_OTP_SUBACCOUNT_AUTH_TOKEN`,
  `TWILIO_OTP_WHATSAPP_FROM=whatsapp:+16592575475`, `TWILIO_OTP_CONTENT_SID=HX7e77…`.

## Login flow
1. User enters WhatsApp number → `POST /auth/login` (`app/api/src/routes/auth.ts`).
2. App matches the number (`providers` for creators, `app_accounts` for users; last-8-digit match)
   and creates a DB session (`createLoginSession` → `login_2fa_sessions`) with a fresh 6-digit
   `code` (5-minute validity, ≤5 attempts).
3. `sendOtpWaThenSms(phone, code)` (`lib/twilio.ts`): tries the **WhatsApp template** first; if that
   send fails, automatically **falls back to plain SMS** with the same code. The response includes
   `otpMethod: "whatsapp" | "sms"` so the UI copy matches.
4. User keys the code back → `POST /auth/2fa/code/check` → `verifyOtpCode` compares it to the DB
   session code, consumes the session once, flips the account `verified` flag, issues a JWT.
5. **Master-code fallback:** `OTP_MASTER_CODE` (env) is accepted for any pending session as an
   operational override; every use is logged (`[otp-master]`). Kept as a safety net.

## Key code
- `lib/twilio.ts` — `sendWhatsAppOtpTemplate`, `sendSmsOtp`, `sendOtpWaThenSms`,
  `isWhatsAppOtpConfigured`, `is2FAEnabled`; plus `sendOnboardingInvite` (creator invites, parent
  account). The OTP sender uses the **subaccount** client; the onboarding invite uses the parent.
- `lib/login2fa.ts` — `createLoginSession`, `verifyOtpCode` (DB-backed, 5-min TTL, master fallback).
- `routes/auth.ts` — `/login`, `/2fa/code/check`.
- Frontend `app/web-vite/src/components/LoginForm.tsx` — code-entry screen; message is
  method-aware ("to your WhatsApp" vs "via SMS").
- API runs from `src/` via **tsx** under PM2 (`pm2 restart baligirls-api`, no build). Web needs
  `cd app/web-vite && pnpm build` then `pm2 restart baligirls-web-vite`.

## Operational notes / known limits
- **SMS fallback from a US number to ID/MY** can hit A2P/registration + deliverability limits — it
  is a best-effort fallback, not guaranteed. WhatsApp is the primary path.
- Sending to a number not on WhatsApp / restricted returns Twilio errors (e.g. `63016` outside the
  24h window for non-template, `63058` business-restricted-in-country, `63024` invalid recipient).
  The approved template avoids `63016`. Verified delivery confirmed to `+60` (Malaysia).
- To rotate/replace the sender: register the number under the verified WABA via the v2 Senders API
  or Console embedded signup; unverified WABAs cap at 2 numbers (error `63104`).

## Decommissioned: OpenClaw "Charles" (`.openclaw-chs`, gda-ai01)
Replaced by the Twilio path above. WhatsApp logged out, gateway **stopped + disabled**
(`openclaw-chs-gateway`). The App's old relay (`lib/openclaw.ts`), the in-memory `lib/otp.ts`, and
the Twilio-Verify functions were removed in the 2026-07-01 OTP cleanup.
