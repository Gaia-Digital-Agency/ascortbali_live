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

## Current focus: WhatsApp login OTP delivery — "Charles"

The `.openclaw-chs` agent (renamed **Charlie → Charles**, 2026-06-19) is now the BG App's
**OTP delivery line — and nothing else**. The goal is to give users/creators the **exact same
experience a Twilio / Meta Business OTP would** (clean code message, reliable delivery, normal
6-digit entry) — without a Meta WABA, by sending over our own linked WhatsApp.

**Login flow** (mostly the App's job; Charles only does step 4):
1. User/creator enters WhatsApp number → clicks **Verify**.
2. App checks the DB (`providers` / `app_accounts`). Not found → **register first**.
3. App generates a 6-digit code (5-min TTL, ≤5 attempts) and sends it **via Charles**.
4. Charles delivers: `Your BG App OTP is xxxxxx`.
5. **No auto-login** — user keys the code back; the App verifies it. This doubles as a
   **human check + WhatsApp-number-validity check**.
6. App logs them in; session persists until lockout.

**How the App reaches Charles:** `app/api/src/lib/openclaw.ts` SSHes to `gda-ai01` and runs
`openclaw message send --channel whatsapp --account main` (no HTTP relay / no direct WS). Built
on app branch **`feature-otp`** (1 commit, local-only). It still targets the **deleted**
`/opt/.openclaw-baligirls` and must be **repointed to `/opt/.openclaw-chs`**.

**Cutover is staged** — the **current live login keeps using Twilio Verify (SMS)** until the owner
says "port over". See `CLAUDE.md` → *Current focus* for the exact cutover steps and the
`checkOtp` Twilio-vs-local conflict to fix.

> ⚠️ Ban risk: Charles uses the *unofficial* WhatsApp Web link. Rate-limit OTP sends; keep the
> WhatsApp Business Cloud API in mind for scale; Twilio Verify stays as the safe fallback.

## `.openclaw-chs` ("Charles") — where it lives

| Thing | Value |
|---|---|
| Host | `gda-ai01` (34.143.206.68), user `azlan` |
| Instance dir | `/opt/.openclaw-chs` |
| Agent | **Charles** (acp default agent `main`), workspace `/opt/.openclaw-chs/workspace-charlie` |
| Model | `deepseek/deepseek-chat` (primary, fallback `google/gemini-2.5-flash`) |
| Gateway | systemd user service `openclaw-chs-gateway.service`, loopback port **19389** |
| WhatsApp line | **+62 817-6917-122** — **linked** (account `main`); send + receive verified |
| Mission Control | `https://chs.gaiada0.online` — needs the gateway token **and** device approval (`openclaw devices approve <id>`) |

## Status — 2026-06-20 — OTP LOGIN LIVE ✅

- ✅ **Charlie → Charles** renamed; brain cleaned to **OTP-delivery-only**; **inbound disabled**
  (`dmPolicy=disabled`) so Charles consumes **0 LLM tokens** (an OTP send is a pure channel op).
- ✅ **Panel migrated** to `https://chs.gaiada0.online`; **WhatsApp linked** (+62 817-6917-122).
- ✅ **Decommissioned** `.openclaw-bgs` + `.openclaw-bsc-archive`; OTP role consolidated into `chs`.
  gda-ai01 upgraded **2→4 vCPU** (e2-custom-4-8192).
- ✅ **Warm relay built** — `bg-otp-relay` (systemd `--user`, `/opt/.openclaw-chs/otp-relay/`)
  on the private VPC `10.148.0.7:19500`, bearer-auth + rate-limit. Reuses OpenClaw's own
  `callGatewayFromCliRuntime` → `request("send",…)` → **~1.6s** (avoids the 31s CLI cold-start).
- ✅ **App side done** (branch `feature-otp` merged to `main` + deleted): app generates 6-digit code,
  Charles delivers via the relay, user keys it back, app verifies (`/auth/2fa/code/check`).
  `OPENCLAW_OTP_ENABLED=true`.
- ✅ **CUTOVER LIVE & VERIFIED** end-to-end on the live site — **both user and creator** logins.
  Twilio Verify SMS + click-to-WhatsApp remain coded fallbacks.
- ⚠️ **Watch**: ban-risk on the unofficial WhatsApp line over time (rate-limited; WhatsApp Business
  Cloud API is the scale path); companion does a routine 30-min idle reconnect.

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
