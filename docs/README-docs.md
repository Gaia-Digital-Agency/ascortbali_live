# Bali Girls — `docs/` knowledge base

This folder is the **project knowledge base, planning & ops workspace** for Bali Girls
(a.k.a. *ascortbali*) — the adult-services creator listing site at
`https://baligirls.gaiada2.online`. It is **not** application code; it is the reference,
runbooks, client material, and operational notes around the project.

This file and `CLAUDE.md` are the **index + status board for the whole `docs/` folder** —
read them first, keep them current.

## Mirror / sync

The same content lives in three places and is kept in sync:

| Location | Path |
|---|---|
| Local working copy | `/Users/…/Downloads/wip/baligirls/` |
| Server | `gda-pn01:/var/www/baligirls/docs/` (git repo, branch `main`) |
| GitHub | `github.com:Gaia-Digital-Agency/ascortbali_live.git` (`main`, under `docs/`) |

Workflow: edit locally → `rsync` local → server `docs/` (excluding `.DS_Store`) → commit & push
from the server repo. `.DS_Store` files are never committed. See `CLAUDE.md` for exact commands.

## Folder map

| Folder | Contents |
|---|---|
| `ads_asset/` | Ad poster artwork + `incoming/` landscape/portrait creatives |
| `changes/` | Change requests + QA smoke notes (`change_request*.md`, `qa-smoke-*.md`) |
| `client_docs/` | Client brief + site-features spec |
| `comparison/` | Competitor/solution case studies (ascortbali, payload/viceroy, gaiada) |
| `engine_matters/` | Listing-engine notes: data injection, flow, engine readme |
| `features/` | Feature inventory, architecture, access info, creator info, T&C, report |
| `files_transfer/` | Brand assets in transit (logo) |
| `gcp_move/` | GCP migration: access, postgres, secrets, phase01/02 move notes |
| `manage/` | Operations: inventory, APIs, schema, local start, server restart |
| `migration_matters/` | Image migration/location/diagram notes |
| `previous_home_ads/` | Archived homepage ad images |
| `templates/` | 🗄️ **Historical** — creator-invitation copy + `creator_contact.md`. *Not current scope* (see below) |
| `testing/` | UAT, login info, fallback access, UI/UX flow, start notes |
| `verification/` | Auth docs + the `.openclaw-chs` agent. Mixed: some **historical** (verifier), some **live** (Twilio login) — see below |

## Current state — login OTP via Twilio WhatsApp + SMS fallback (LIVE, 2026-07-01)

Login OTP is delivered by **Twilio WhatsApp** (approved authentication template) with an automatic
**plain-SMS fallback**, both carrying a 6-digit code the App generates and verifies (5-minute
validity). The old OpenClaw **"Charles"** relay is **decommissioned**.

- Sender `+1 659-257-5475` on the verified "AG Alchemy" WABA `2099451430940742`; template
  `HX7e77778694040c69ad3c4e208ba31bd4`; Twilio subaccount `Baligirls WhatsApp OTP`.
- Authoritative detail + runbook: **[`verification/otp-current.md`](verification/otp-current.md)**.
- `.openclaw-chs` (Charles) on gda-ai01: WhatsApp logged out, gateway stopped + disabled.
- Master-code fallback (`OTP_MASTER_CODE`) remains as an operational safety net.

## Done — nothing outstanding

The OTP login is in production and verified. Architecture + key files are documented in the app
repo's [CLAUDE.md](.) (root) under **Authentication**. Future scale/hardening option: move to the
WhatsApp Business Cloud API if volume grows.

## Historical / superseded (kept — no data loss)

- `templates/` — the creator **invitation** campaign (5 DEMS templates, `creator_contact.md`
  with 214 contacts, `invite_brief.md`). **Not** part of Charles's current OTP-only scope; retained
  as reference in case the invitation initiative is revived.
- `verification/architecture.md`, `runbook.md`, `verify-flow.md`, `bootstrap-chs.sh` — describe
  Charles's **old number-verifier** behaviour, which no longer exists.
- Still current: `verification/whatsapp-auth-lessons.md` + `twilio_auth_guide.md` cover the
  **live login** (Twilio Verify SMS + click-to-WhatsApp), active until cutover.
