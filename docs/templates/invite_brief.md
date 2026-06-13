# Invitation Strategy — brief

Concise plan for inviting Bali Girls creators to claim/complete their profiles via WhatsApp.

## Goal
Get existing (pre-seeded) creators to sign in at `https://baligirls.gaiada2.online/creator`,
check their profile, and add photos/details — by sending each one a warm, personal, **one-time**
WhatsApp invitation.

## Who sends
The OpenClaw agent **Charlie** (`.openclaw-chs` on `gda-ai01`), WhatsApp line **+62 817-6917-122**.
Sends **directly over WhatsApp** — **no Twilio** (Twilio is only the site's login verification).
**Fire-and-forget**: one message per creator, no two-way follow-up required.

## What's sent — category-matched copy
Each creator gets the template matching their **DEMS category**. Templates live alongside this file:

| Category | Template | Source rule |
|---|---|---|
| Dating  | `dating.md`  | `escort_type = 'dating'` |
| Escorts | `escorts.md` | `escort_type = 'escort'` |
| Massage | `massage.md` | `escort_type = 'massage'` |
| Sugar   | `sugar.md`   | `escort_type = 'sugar babies'` |
| Trans   | `trans.md`   | `gender = 'trans'` (overrides escort_type) |

Each template uses one merge field, `{{name}}` (← `providers.model_name`), and ends with the
creator sign-in link.

## Who receives — the contact list
`creator_contact.md` is the authoritative send list, generated from the app DB (`providers`).
**214 invites** (escorts 154 · dating 29 · massage 14 · sugar 11 · trans 6), overwhelmingly
+62 Indonesia (192). It was built from 230 creators minus **16 profiles on 6 duplicate numbers**,
which are excluded (listed in the file's Skipped section).

### By country code (214 total)
| Country | Invites |
|---|---|
| +62 Indonesia | 192 |
| +7 Russia/KZ | 7 |
| +44 UK | 2 |
| +66 Thailand | 2 |
| +61 Australia | 2 |
| +373 Moldova | 2 |
| +86 China | 1 |
| +65 Singapore | 1 |
| +971 UAE | 1 |
| +972 Israel | 1 |
| +60 Malaysia | 1 |
| +33 France | 1 |
| +380 Ukraine | 1 |

## Send rules
1. For each row in `creator_contact.md`, send the template in its **Template** column with
   `{{name}}` replaced by **Name**.
2. **One message per number** — never message a number twice; never message a number not on the list.
3. Numbers are E.164 (`+` + digits); sanity-check obviously malformed ones before sending.

## What the creator experiences (after they tap the link)

The invite is just the front door. Sign-in itself is **passwordless** and verified by WhatsApp —
no password to remember, no template, no app to install.

1. **Gets the invite** — a personal WhatsApp from Charlie (**+62 817-6917-122**) with the
   `…/creator` link.
2. **Taps the link** → the creator sign-in page. Enters their **WhatsApp number** (the same one
   we messaged). The system finds their pre-seeded profile by that number.
3. **Verifies by WhatsApp (user-initiated click-to-verify)** — the page shows a one-tap
   `wa.me` button pre-filled with a short code (`BG-…`) addressed to the site's
   **verification line +1 740 762 8065**. The creator taps it, WhatsApp opens with the message
   ready, and they hit **Send**.
4. **Auto-logged in** — the backend confirms by matching that inbound code from their number
   (it polls Twilio's Messages API), flips their account to `verified`, and signs them in. No
   code to type back.
5. **Lands on their profile** — they can now add photos and details. Their profile is live at
   their slug URL (e.g. `…/creator/preview/<slug>`).

### Verification recap (the mechanics)
- **Passwordless** for users & creators: identify by WhatsApp number → verify by WhatsApp.
- **Primary path = user-initiated click-to-verify**: works **without** message templates or Meta
  business verification, using the free-form 24h window opened when the person messages first.
- **Twilio is used only here** (to read the inbound code via the Messages API) — **not** for the
  invitations. The SMS-OTP fallback exists but is **disabled** in the UI.
- ⚠️ Two different numbers, by design: creators are **invited** from Charlie's
  **+62 817-6917-122**, but they **verify by messaging +1 740 762 8065**. The invite copy points
  them to the website, not to a reply — so this is seamless, but keep it in mind for support.
- Full detail: `../verification/whatsapp-auth-lessons.md` (authoritative).

## Status & risks
- ⏳ **Not live yet** — Charlie's WhatsApp line must be re-linked (QR scan) before any send;
  his on-host brain (`AGENTS.md`) still describes the old verifier role and must be rewritten
  for this invite job.
- ⚠️ **Ban risk** — bulk, unsolicited, business-initiated marketing over an unofficial WhatsApp
  Web client can get the number banned.
  - **Recommended throttle: max ~20 messages per day, sent ~1 hour apart, paced by OpenClaw**
    (Charlie self-schedules the drip — no manual blasting). At 20/day, the full 214-contact run
    takes ~11 days.
  - Also decide warm-up (start with a handful/day, ramp up) and an opt-out/stop handling rule.
