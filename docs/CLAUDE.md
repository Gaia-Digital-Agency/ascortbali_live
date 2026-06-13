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

## Current focus: creator WhatsApp invitations

Repurpose the `.openclaw-chs` agent **"Charlie"** from *number verifier* → *invitation sender*:

- Charlie sends a **one-time** WhatsApp invitation per creator — **fire-and-forget**, no two-way
  follow-up needed.
- Message body = the `templates/<category>.md` matching the creator's **DEMS category**
  (`dating`, `escorts`, `massage`, `sugar`, `trans`); `{{name}}` is the only merge field.
- Recipient list (name, WhatsApp number, category) comes from the **app DB** — each creator is
  already DEMS-tagged. Wire the exact table/column when building the send job.
- **No Twilio in this path** — Charlie sends directly over OpenClaw's WhatsApp channel. (Twilio is
  used *only* for login verification; see `verification/whatsapp-auth-lessons.md`.)

Still to do: rewrite Charlie's on-host brain (`/opt/.openclaw-chs/workspace-charlie/AGENTS.md`,
`SKILLS.md`, etc.) and the `verification/` docs (`architecture.md`, `runbook.md`, `verify-flow.md`,
`bootstrap-chs.sh`) — they all still describe the old verifier behaviour.

## OpenClaw fleet conventions (gda-ai01)

- One instance = `/opt/.openclaw-<slug>` (`/opt` root-owned; instance dir owned by `azlan`, mode 700).
- Config `/opt/.openclaw-<slug>/openclaw.json` (mode 600): agents, channels, gateway.
- Each agent = `workspace-<name>/` of markdown brain files (`AGENTS.md` behaviour, plus
  `IDENTITY/SOUL/SKILLS/TOOLS/USER/HEARTBEAT/MEMORY.md`).
- Runtime = `systemctl --user` unit `openclaw-<slug>-gateway.service`, one unique loopback port
  (**chs = 19389**). Model keys from `EnvironmentFile=/opt/.openclaw-keys.env`.
- Mission Control = gateway Control UI at `https://<subdomain>/#token=<gateway token>`, nginx
  (`/etc/nginx/sites-available/openclaw`) → loopback port.
- Platform binary: `/home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js` (v2026.4.x).

## This instance (`chs` / Charlie)

slug `chs`, agent **Charlie**, port **19389**, panel `https://chs.gaiada.online`,
WhatsApp line **+62 817-6917-122**, model `google/gemini-2.5-flash`.

## Guardrails

- gda-ai01 runs **7 other production agent instances**. Only ever touch `chs`-named
  files/services/ports. Never edit another instance's config, workspace, unit, or nginx block.
- `sudo nginx -t` before `sudo systemctl reload nginx`.
- Never print secrets (gateway tokens, API keys, WhatsApp session creds) into shared output.
- Bulk unsolicited WhatsApp marketing over the (unofficial) WhatsApp Web client risks a number
  ban — factor in throttling / opt-out / warm-up before any real send.
- Access: docs/git host `ssh gda-pn01`; OpenClaw host `ssh gda-ai01` (user azlan,
  key `~/.ssh/id_ed25519_gaia`).

## Common commands (on gda-ai01)

```bash
systemctl --user status openclaw-chs-gateway.service --no-pager   # health
ss -ltnp | grep 19389                                             # listener
journalctl --user -u openclaw-chs-gateway.service -f              # logs
systemctl --user restart openclaw-chs-gateway.service             # after editing config/workspace
# link / relink WhatsApp (+62 817-6917-122 scans the QR)
OPENCLAW_CONFIG_PATH=/opt/.openclaw-chs/openclaw.json OPENCLAW_STATE_DIR=/opt/.openclaw-chs \
  node /home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js channels login --channel whatsapp
```

## Status — 2026-06-14

- ✅ Login verification shipped (user-initiated WhatsApp click-to-verify; Twilio = login only).
- ✅ `templates/` cleaned (5 DEMS categories, `{{name}}` merge field).
- 🔜 Invitation repurpose decided — Charlie brain + `verification/` docs rewrite pending; DB→send job pending.
- ⏳ WhatsApp line +62 817-6917-122 **not yet linked** — owner will rescan QR later to activate.
- ⏳ Panel TLS pending DNS (point `chs.gaiada.online` → 34.143.206.68).
