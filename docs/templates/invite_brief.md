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

## Send rules
1. For each row in `creator_contact.md`, send the template in its **Template** column with
   `{{name}}` replaced by **Name**.
2. **One message per number** — never message a number twice; never message a number not on the list.
3. Numbers are E.164 (`+` + digits); sanity-check obviously malformed ones before sending.

## Status & risks
- ⏳ **Not live yet** — Charlie's WhatsApp line must be re-linked (QR scan) before any send;
  his on-host brain (`AGENTS.md`) still describes the old verifier role and must be rewritten
  for this invite job.
- ⚠️ **Ban risk** — bulk, unsolicited, business-initiated marketing over an unofficial WhatsApp
  Web client can get the number banned. Before a real run, decide throttling (slow drip, not a
  blast), warm-up, and an opt-out/stop handling rule.
