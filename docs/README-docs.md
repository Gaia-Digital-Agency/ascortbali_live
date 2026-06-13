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
| `templates/` | **WhatsApp creator-invitation copy** (one `.md` per DEMS category) + `creator_contact.md` (Charlie's contact DB) (see below) |
| `testing/` | UAT, login info, fallback access, UI/UX flow, start notes |
| `verification/` | Auth + the `.openclaw-chs` "Charlie" agent (see below) |

## Two live workstreams

### A. Login verification (shipped) — `verification/`

Passwordless login for users & creators: identify by WhatsApp number, verify by WhatsApp
**user-initiated click-to-verify** (the person taps a `wa.me` deep link; backend confirms by
polling the Twilio Messages API for the `BG-` token). A Twilio Verify **SMS** fallback is built
but **disabled in the UI**. **Twilio is used only for this login flow** — see
`verification/whatsapp-auth-lessons.md` (authoritative) and `verification/twilio_auth_guide.md`
(partially outdated).

### B. Creator invitations (foundation in progress) — `templates/` + `verification/`

The `.openclaw-chs` OpenClaw agent **"Charlie"** is being **repurposed from a number-verifier
into an invitation sender**. New job: send a **one-time** WhatsApp invitation to each creator,
using the `templates/` markdown that matches the creator's **DEMS category**
(`dating`, `escorts`, `massage`, `sugar`, `trans`). Each template uses a `{{name}}` merge field
and links to `…/creator`.

- **No Twilio for invitations** — Charlie sends directly over OpenClaw's WhatsApp channel.
- **Fire-and-forget** — one outbound message per creator; no ongoing two-way interaction required.
- **Recipients** come from the **app database**, where each creator is already tagged with a
  DEMS category (exact table/column to be wired when we build the send job).

> ⚠️ The instance docs in `verification/` (`architecture.md`, `runbook.md`, `verify-flow.md`,
> `bootstrap-chs.sh`) and Charlie's on-host `AGENTS.md` **still describe the old verifier
> behaviour** — they will be rewritten for the invitation role.

## `.openclaw-chs` ("Charlie") — where it lives

| Thing | Value |
|---|---|
| Host | `gda-ai01` (34.143.206.68), user `azlan` |
| Instance dir | `/opt/.openclaw-chs` |
| Agent | **Charlie** (acp default agent `main`), workspace `/opt/.openclaw-chs/workspace-charlie` |
| Model | `google/gemini-2.5-flash` (fallback `deepseek/deepseek-chat`) |
| Gateway | systemd user service `openclaw-chs-gateway.service`, loopback port **19389** |
| WhatsApp line | **+62 817-6917-122** (linked via OpenClaw WhatsApp Web) |
| Mission Control | `https://chs.gaiada.online` (nginx on gda-ai01 → loopback 19389) |

## Status — 2026-06-14

- ✅ Login verification (user-initiated WhatsApp click-to-verify) **shipped & in use**.
- ✅ `templates/` cleaned and standardised (5 DEMS categories, `{{name}}` merge field).
- ✅ `templates/creator_contact.md` generated from the app DB — **214 invites** (230 creators
  − 16 profiles on 6 duplicate numbers, now excluded): escorts 154 / dating 29 / massage 14 /
  sugar 11 / trans 6. Mostly +62 Indonesia (192). Regenerate when the creator list changes.
- ✅ Charlie's OpenClaw instance/service exists and runs (bound on :19389).
- 🔜 **Repurpose decided, not yet built**: rewrite Charlie's brain (`AGENTS.md` etc.) +
  `verification/` docs for the invitation role; wire the DB → category → template send job.
- ⏳ **WhatsApp line not linked** — owner will **rescan the QR later** to activate +62 817-6917-122.
  Foundation is being prepared in the meantime.
- ⏳ **Panel TLS pending DNS** — `chs.gaiada.online` must point to gda-ai01 `34.143.206.68`
  before certbot. See `verification/runbook.md`.
- ⚠️ **Open risk**: bulk unsolicited business-initiated marketing over an unofficial WhatsApp
  Web client carries a real number-ban risk; throttling / opt-out / warm-up to be decided.
