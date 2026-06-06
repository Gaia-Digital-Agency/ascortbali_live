# WhatsApp 2FA Setup Guide

## 1. Twilio Account Setup

You need a Twilio account with WhatsApp messaging enabled:

- **Twilio Account SID** - from your Twilio dashboard (https://console.twilio.com)
- **Twilio Auth Token** - from your Twilio dashboard
- **WhatsApp Sender Number** - either:
  - **Sandbox** (for testing): `whatsapp:+14155238886` (Twilio's default sandbox number)
  - **Production**: An approved WhatsApp Business number from Twilio

### Twilio Sandbox Setup (for testing)

1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message
2. Each test recipient must **join the sandbox** first by sending a WhatsApp message to `+14155238886` with the join code shown (e.g. "join example-word")
3. Sandbox has a **5 messages/day limit** per recipient
4. For production, apply for a Twilio WhatsApp Business Profile

## 2. Set Environment Variables

In `/var/www/baligirls/app/api/.env`, set:

```
WHATSAPP_2FA_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

These must also be set in the PM2 process environment. When recreating the PM2 process, pass them as env vars before the `pm2 start` command. See the deployment notes for the full PM2 start command.

To **disable** 2FA, set `WHATSAPP_2FA_ENABLED=false` and restart.

## 3. Ensure Users Have WhatsApp Numbers

- **Users** - WhatsApp number stored in `app_accounts.whatsapp` column
- **Creators** - WhatsApp number stored in `providers.cell_phone` column
- If a user/creator has **no WhatsApp number** on file, 2FA is skipped and they log in normally
- Numbers must include country code (e.g. `+628176917122`)

Users and creators can set their WhatsApp number on their profile page. Admin can also edit it via the admin CMS popup.

## 4. Restart API

```bash
pm2 restart baligirls-api --update-env
```

Or if recreating the process (see PM2 start command in deployment notes).

## How It Works

This is **one-time phone verification**, not per-login 2FA. A user/creator is
prompted for a WhatsApp OTP only until their phone number is verified once;
after that they log in with password only.

1. User enters email + password on the login page
2. API validates credentials
3. If 2FA is enabled AND user has a phone number AND the account is **not yet verified**:
   - A 6-digit OTP is sent to their WhatsApp via Twilio
   - Login page shows a "Verify Identity" screen with a code input
4. User enters the 6-digit code to complete login
5. On success, the account's `verified` flag is set to `true` — they are not prompted again
6. If WhatsApp send fails (e.g. Twilio error), login falls through to normal (no 2FA)

### The `verified` flag

- Verification state is stored in the existing `verified` boolean column on
  both `providers` (creators) and `app_accounts` (users/admins).
- The **admin CMS** can toggle `verified` directly: check it to manually trust
  an account (skip 2FA), or uncheck it to force re-verification on next login.
- If a user/creator **changes their phone number via their own profile**,
  `verified` is automatically reset to `false` so the new number is re-verified.
  (Admin edits in the CMS respect the admin's explicit `verified` choice.)

### OTP Details

- Code expires after **5 minutes**
- Maximum **5 attempts** per code
- User can click **"Resend code"** to get a new code
- User can click **"Back to login"** to start over

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Login goes straight through (no OTP screen) | 2FA disabled, no WhatsApp number, or Twilio send failed | Check env vars, check user has WhatsApp number, check Twilio logs |
| "Twilio could not find a Channel" | Wrong sender number | Use the sandbox number `+14155238886` or an approved WhatsApp Business number |
| "exceeded daily messages limit" | Sandbox limit hit | Wait 24 hours or upgrade to production WhatsApp |
| "Provided scope(s) are not authorized" | Wrong Twilio credentials | Verify SID and Auth Token in Twilio dashboard |
| Recipient not receiving messages | Sandbox not joined | Recipient must send join code to sandbox number first |
