# Lessons Learned — WhatsApp Authentication & Login

Hard-won notes from building Bali Girls' WhatsApp-based login (June 2026). Read this
before touching anything related to Twilio, WhatsApp, OTP, or the login/2FA flow.

## TL;DR
- **Login is passwordless** for user + creator portals: identify the account by its
  **WhatsApp number**, then verify by WhatsApp (or SMS fallback). Admin still uses
  username + password.
- **OTP delivery uses Twilio Verify** (`TWILIO_VERIFY_SERVICE_SID`), channel `sms` by
  default — flip `TWILIO_VERIFY_CHANNEL=whatsapp` only once a healthy WhatsApp sender
  exists.
- **WhatsApp click-to-verify** (the cheap, primary path) works **without templates or
  business verification** by using the user-initiated 24h window — and we confirm it by
  **polling the Twilio Messages API**, not by relying on inbound webhooks.

---

## 1. WhatsApp message templates (business-initiated)

- Templates have a **category**: `UTILITY`, `AUTHENTICATION`, or `MARKETING`. Meta's
  classifier reads the **content** and overrides your chosen category. Submitting with the
  wrong one → rejected `INCORRECT_CATEGORY`.
- Any message containing a **verification code, OTP, password, or "verify your login"**
  language is force-classified as **AUTHENTICATION** — even if you submit it as UTILITY.
- **AUTHENTICATION templates cannot be created by an unverified business.** You get Meta
  error `subCode 2388185` ("account does not have permission to create message template").
  This requires **Meta Business Verification** (and Meta also gates auth templates behind a
  messaging-volume threshold). It is **not** a wording problem and cannot be worked around
  at the template level.
- A neutral, genuinely-transactional UTILITY template (e.g. "your booking is confirmed")
  **does** get accepted — proving the account *can* make templates; only auth-flavoured
  ones are blocked.
- **Variable position rule:** a `{{n}}` placeholder may not sit at the very start or end of
  the body (error `2388299`). Always wrap variables in static text.
- Authentication templates use a fixed Meta-controlled body + a mandatory **Copy-Code
  button** (`whatsapp/authentication` content type) — you cannot write custom wording.

## 2. Twilio Verify (the reliable OTP path)

- Twilio Verify generates/sends/checks the code itself — **no template, no WABA needed**
  for SMS. This is why OTP works even while WhatsApp is blocked.
- Gotcha: a Verify **service** can have its **SMS channel disabled** → error `60223`
  ("Delivery channel disabled: SMS"). We had two services; one worked, one didn't. Use the
  one with SMS enabled and confirm with a live send.
- The Verify **service friendly name** appears in the SMS ("Your <name> verification
  code is…") — name it properly.
- **Cost matters:** Indonesian SMS is ~**$0.44/msg** + $0.05 Verify fee ≈ **$0.49/login**.
  Australia ≈ $0.10, Malaysia ≈ $0.39. WhatsApp is ~10× cheaper — a real reason to prefer
  WhatsApp for the +62 market.
- SMS **Geo Permissions** are Console-only (no API). Most countries are on by default.

## 3. WhatsApp click-to-verify (user-initiated) — the cheap primary path

- After a user **messages your number first**, you get a **24-hour window** to send
  **free-form** messages — no template, no approval, no business verification. This is how
  we do WhatsApp OTP without any of the template pain.
- Flow: login page shows a `wa.me/<number>?text=…BG-<token>…` deep link → user taps Send →
  their inbound opens the window → we match the unique `BG-` token **and** require the
  sender's number to equal the account's registered number → verified.

### ⚠️ The big inbound-routing trap (cost us the most time)
- Twilio **received** the inbound message fine (`direction=inbound`, `received`) but **never
  called our webhook** — with **no error alert**.
- We set the **WhatsApp Sender webhook** (`v2/Channels/Senders`) AND the number's
  **`SmsUrl`** — neither delivered. The number's `SmsUrl` was even still the leftover
  **`demo.twilio.com`** URL.
- Root cause: WhatsApp inbound routing for this account didn't honour either field
  reliably, and a successful POST to the demo URL produces no error to alert on.
- **Solution that actually works: don't depend on the inbound webhook.** Since Twilio's
  **Messages API reliably lists inbound messages**, the browser-poll endpoint queries
  Twilio directly for "an inbound to our number, from this phone, containing this token."
  See `findInboundToken()` in `app/api/src/lib/twilio.ts` and `pollVerify()` in
  `app/api/src/lib/login2fa.ts`. The webhook stays wired as a faster path but is not
  required.

## 4. Architecture notes that bit us

- **Cluster workers + in-memory state = bug.** The API runs 2 pm2 cluster workers; the
  original OTP session store was in-memory, so a login on worker A and a verify/poll on
  worker B wouldn't find the session. **2FA sessions must live in the DB**
  (`login_2fa_sessions` table, see `login2fa.ts`).
- **CSRF middleware** (require `X-Requested-With` / JSON content-type) blocks Twilio's
  form-encoded webhook → exempt `/auth/wa/inbound` (it's protected by token + sender-number
  match instead).
- **Phone matching** across formats (`+62…`, `0…`, `62…`): normalize to digits and compare
  the **last 8 digits**. Used both in the login lookup and the inbound match.

## 5. WABA / Meta access

- The WhatsApp Business Account (WABA) linked to Twilio is administered in **Meta Business
  Manager**, reached most reliably **via the Twilio Console WhatsApp Senders page** (not
  generic business.facebook.com). Both require human logins (Twilio Console + a Facebook
  admin of the WABA) — API keys alone are not enough.
- A transient `63111` "WABA not found" in the senders **list** doesn't mean it's gone;
  check the single-sender GET (it showed ONLINE, tier "250 Customers/24hr").

## 6. Current login design (as shipped)

- `POST /auth/login`:
  - `portal=admin` → username/email + password (unchanged).
  - `portal=user|creator` → `{ phone }` only → look up account by phone → return
    `{ twoFactorRequired, token, waNumber }`. Unknown phone → `unknown_user`.
- Verification completes via `GET /auth/2fa/wa/poll` (WhatsApp, Twilio-polling) or
  `POST /auth/2fa/sms/send` + `/sms/check` (SMS fallback).
- **Registration** collects email (required, stored) + WhatsApp number; **no password**;
  registration does **not** verify (only login does). A random unusable password hash is
  stored to satisfy the NOT NULL column.
- Switch OTP back to WhatsApp-via-Verify later with one env var once the WABA is verified.
