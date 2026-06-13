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
- Recipient list = **`templates/creator_contact.md`** (214 invites), generated from the app DB
  (`providers`): name ← `model_name`, phone ← `cell_phone` (E.164-normalised), category ←
  `gender='trans'` else `escort_type` (`escort→escorts`, `dating`, `massage`, `sugar babies→sugar`).
  6 duplicate numbers (16 escort profiles) are excluded. Regenerate when the creator list changes.
- Strategy + verification recap + country breakdown + throttle live in **`templates/invite_brief.md`**.
- **No Twilio in this path** — Charlie sends directly over OpenClaw's WhatsApp channel. (Twilio is
  used *only* for login verification; see `verification/whatsapp-auth-lessons.md`.)
- **Throttle**: ~20 invites/day, ~1h apart, OpenClaw-paced (~11 days for the full run).

Still to do (the plan): (1) re-link Charlie's WhatsApp + DNS/TLS; (2) rewrite his on-host brain
(`/opt/.openclaw-chs/workspace-charlie/AGENTS.md`, `SKILLS.md`, `IDENTITY.md`) and the stale
`verification/` docs from verifier → inviter; (3) build the drip send job (read `creator_contact.md`
→ pick `<category>.md` → fill `{{name}}` → send → mark sent → schedule next, cap ~20/day);
(4) define opt-out/stop handling + warm-up.

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
- ✅ `templates/` complete: 5 DEMS templates (`{{name}}`), `creator_contact.md` (214 invites),
  `invite_brief.md` (strategy + verification recap + country breakdown + throttle).
- ✅ Throttle agreed: ~20/day, ~1h apart, OpenClaw-paced.
- 🔜 Invitation repurpose decided — Charlie brain + `verification/` docs rewrite pending; drip send job pending.
- ⏳ WhatsApp line +62 817-6917-122 **not yet linked** — owner will rescan QR later to activate.
- ⏳ Panel TLS pending DNS (point `chs.gaiada.online` → 34.143.206.68).
