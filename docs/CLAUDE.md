# CLAUDE.md — Bali Girls `docs/` workspace

This folder is the **knowledge base & ops workspace** for the Bali Girls (*ascortbali*) project —
reference docs, runbooks, client material, and operational notes. It is **not** application code.
Together with `README-docs.md`, this file is the **tracker/monitor for the entire `docs/` folder**:
keep both current as work progresses. `README-docs.md` is the human-facing index + status board;
this file is the playbook for Claude sessions.

## Three-way mirror — keep in sync

Local ⇄ server ⇄ GitHub hold the same content.

| Location | Path |
|---|---|
| Local | `/Users/…/Downloads/wip/baligirls/` |
| Server | `gda-pn01:/var/www/baligirls/docs/` (git repo `main`) |
| GitHub | `github.com:Gaia-Digital-Agency/ascortbali_live.git` (`main`, `docs/`) |

```bash
# 1. local -> server docs/ (mirror; never sync .DS_Store or .claude/)
rsync -az --delete --exclude='.DS_Store' --exclude='.claude/' \
  ./ gda-pn01:/var/www/baligirls/docs/
# 2. commit + push from the server repo
ssh gda-pn01 'cd /var/www/baligirls && git add -A && git commit -m "docs: …" && git push origin main'
```

Dry-run first (`rsync -azn --delete --itemize-changes …`) and confirm no unexpected deletions —
the working rule for this folder is **no data loss**.

## Current state: login OTP via Twilio WhatsApp + SMS fallback (LIVE)

Login OTP for users/creators is delivered by **Twilio WhatsApp** using an approved authentication
template, with an automatic **plain-SMS fallback**. The old OpenClaw **"Charles"** relay is
**decommissioned**. Authoritative detail + runbook: [`verification/otp-current.md`](verification/otp-current.md).

- **Sender** `+1 659-257-5475` on the **verified** "AG Alchemy" WABA `2099451430940742`
  (Twilio subaccount `AC…cf1`); approved template
  `HX7e77778694040c69ad3c4e208ba31bd4` (code = `{{1}}`).
- **Flow:** App generates a 6-digit code (5-min validity, ≤5 attempts) → WhatsApp template → on
  send failure auto-falls-back to SMS (same code) → user keys it back → App verifies against its
  own DB session (`login_2fa_sessions`).
- **Code:** `app/api/src/lib/twilio.ts` (`sendOtpWaThenSms`/`sendWhatsAppOtpTemplate`/`sendSmsOtp`),
  `routes/auth.ts` `/login` + `/2fa/code/check`, `lib/login2fa.ts`. API runs from `src/` via tsx.
- **Master-code fallback** (`OTP_MASTER_CODE`) kept as an operational safety net.
- **Charles / `.openclaw-chs`** (gda-ai01): WhatsApp logged out; gateway stopped + disabled. The
  OpenClaw send path (`lib/openclaw.ts`), in-memory `lib/otp.ts`, and Twilio-Verify helpers were
  removed in the 2026-07-01 OTP cleanup.

## OpenClaw fleet conventions (gda-ai01)

- One instance = `/opt/.openclaw-<slug>` (`/opt` root-owned; instance dir owned by `azlan`, mode 700).
- Config `/opt/.openclaw-<slug>/openclaw.json` (mode 600): agents, channels, gateway.
- Each agent = `workspace-<name>/` of markdown brain files (`AGENTS.md` behaviour, plus
  `IDENTITY/SOUL/SKILLS/TOOLS/USER/HEARTBEAT/MEMORY.md`).
- Runtime = `systemctl --user` unit `openclaw-<slug>-gateway.service`, one unique loopback port
  (**chs = 19389**). Model keys from `EnvironmentFile=/opt/.openclaw-keys.env`.
- Mission Control = gateway Control UI at `https://<subdomain>/#token=<gateway token>`, nginx
  (`/etc/nginx/sites-available/openclaw`) → loopback port. The Control UI **also requires device
  pairing**: a new browser lands in the pending queue and must be approved with
  `openclaw devices approve <requestId>` (the token alone is not enough).
- Platform binary: `/home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js` (v2026.4.x).

## This instance (`chs` / Charles)

| Thing | Value |
|---|---|
| Slug / agent | `chs` / **Charles** (acp agent `main`, workspace `workspace-charlie`) |
| Port | loopback **19389** |
| Panel | `https://chs.gaiada0.online` (migrated 2026-06-19 from `chs.gaiada.online`, which was removed) |
| Gateway token | `gateway.auth.token` in `openclaw.json` (paste into Control UI; never print it here) |
| WhatsApp line | **+62 817-6917-122** — **linked** (account `main`); send + receive verified |
| Model | `deepseek/deepseek-chat` (primary), `google/gemini-2.5-flash` (fallback) |
| Scope | **OTP delivery only** — brain rewritten 2026-06-19 (verifier/invite/manager removed) |

**Decommissioned 2026-06-19:** `.openclaw-bgs` (the old "Bali Girls OTP" instance, port 19199,
`bgs.gaiada0.online`) and `.openclaw-bsc-archive` — process killed, nginx blocks + Let's Encrypt
certs removed, dirs deleted, `bgs` DNS removed by owner. The OTP role consolidated into `chs`.

## Guardrails

- gda-ai01 runs **7 other production agent instances**. Only ever touch `chs`-named
  files/services/ports. Never edit another instance's config, workspace, unit, or nginx block.
- `sudo nginx -t` before `sudo systemctl reload nginx`.
- Never print secrets (gateway tokens, API keys, WhatsApp session creds) into shared output.
- OTP over the **unofficial** WhatsApp Web client risks a number ban — rate-limit; consider the
  WhatsApp Business Cloud API at scale; keep Twilio Verify as fallback until cutover is proven.
- **App is parallel-developed by azlan** — `/var/www/baligirls` is a live git checkout
  (branch `feature-otp`). Re-check current file state before editing; don't clobber his branch.
- Access: docs/git host `ssh gda-pn01`; OpenClaw host `ssh gda-ai01` (user azlan,
  key `~/.ssh/id_ed25519_gaia`).

## Common commands (on gda-ai01)

```bash
systemctl --user status openclaw-chs-gateway.service --no-pager   # health
ss -ltnp | grep 19389                                             # listener
journalctl --user -u openclaw-chs-gateway.service -f              # logs
systemctl --user restart openclaw-chs-gateway.service             # after editing config/workspace
openclaw devices list                                             # Control UI pairing queue
openclaw devices approve <requestId>                              # approve a new browser/device
openclaw health                                                   # incl. WhatsApp link state
# send a WhatsApp message (this is the exact OTP send path the App uses over SSH)
OPENCLAW_STATE_DIR=/opt/.openclaw-chs /home/azlan/.npm-global/bin/openclaw message send \
  --channel whatsapp --account main --target +62XXXXXXXXXX --message "Your BG App OTP is 123456" --json
```

## Status — 2026-06-20 — OTP LOGIN LIVE ✅

- ✅ **Charlie → Charles** renamed; brain cleaned to **OTP-delivery-only**; inbound disabled (`dmPolicy=disabled`) → Charles uses **0 LLM tokens**.
- ✅ **Panel migrated** to `https://chs.gaiada0.online`; **WhatsApp linked** (+62 817-6917-122).
- ✅ **`bgs` + `bsc-archive` decommissioned**; OTP role consolidated into `chs`. gda-ai01 upgraded 2→4 vCPU.
- ✅ **Warm relay built** — `bg-otp-relay` (systemd `--user`) at `/opt/.openclaw-chs/otp-relay/`, listens on the private VPC `10.148.0.7:19500`, bearer-auth, rate-limited. Imports OpenClaw's own `callGatewayFromCliRuntime` → `request("send",…)` (~1.6s; avoids the 31s CLI cold-start).
- ✅ **App side done** (branch `feature-otp` merged to `main` + deleted): `login2fa` (code/attempts, `verifyOtpCode`), `auth` (`/2fa/code/check`), `openclaw.ts` (POSTs to relay over VPC), `LoginForm` codeMode. Migration `migrate-otp-code-column.ts`. `OPENCLAW_OTP_ENABLED=true`.
- ✅ **CUTOVER LIVE & VERIFIED** end-to-end (user + creator) on the live site. Twilio Verify SMS + click-to-WhatsApp remain coded fallbacks.
- ⚠️ **Open risk / watch**: OTP over the unofficial WhatsApp Web line → ban risk over time; rate-limit + consider WhatsApp Business Cloud API at scale. Companion does a routine 30-min idle reconnect.

## Historical (superseded — kept for reference, not current scope)

- `templates/` — the creator **invitation** copy (5 DEMS templates, `creator_contact.md`,
  `invite_brief.md`). The invitation campaign is **not** part of Charles's current scope.
- `verification/` — the old **number-verifier** + early auth docs (`architecture.md`, `runbook.md`,
  `verify-flow.md`, `bootstrap-chs.sh`). Describe behaviour Charles no longer has.
- `verification/whatsapp-auth-lessons.md` + `twilio_auth_guide.md` remain relevant for the
  **current live login** (Twilio Verify SMS + click-to-WhatsApp), which stays active until cutover.
