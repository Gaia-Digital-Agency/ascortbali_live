# CLAUDE.md — working on `.openclaw-chs` (Charlie)

This repo is the **planning/ops workspace** for one OpenClaw instance. The live instance runs on
the remote host **`gda-ai01`** — nothing here executes locally except `bootstrap-chs.sh` (which
you run *on* the host).

## The fleet conventions (learned from the other instances)

OpenClaw instances on `gda-ai01` all follow one pattern:

- One instance = `/opt/.openclaw-<slug>` (root-owned `/opt`, instance dir owned by `azlan`, mode 700).
- Config = `/opt/.openclaw-<slug>/openclaw.json` (mode 600). Defines agents, channels, gateway.
- Each agent = a `workspace-<name>/` dir of markdown "brain" files: `AGENTS.md` (behaviour),
  `IDENTITY.md`, `SOUL.md`, `SKILLS.md`, `TOOLS.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md`.
- Runtime = `systemctl --user` service `openclaw-<slug>-gateway.service`, one **unique loopback
  port** per instance (18789, 18889, 18989, 19089, 19189, 19289, **chs=19389**).
- Model keys are shared via `EnvironmentFile=/opt/.openclaw-keys.env`
  (`GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`).
- Mission Control = the gateway's built-in Control UI, reached at `https://<host-or-subdomain>/#token=<gateway token>`,
  fronted by nginx (`/etc/nginx/sites-available/openclaw`) proxying the subdomain → loopback port.
- The platform binary: `/home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js`
  (version 2026.4.x). Base source clone: `/opt/source_base_openclaw`. Runbook: `/opt/documentation/ops_control.md`.

## This instance

- slug `chs`, agent **Charlie**, port **19389**, panel `https://chs.gaiada.online`,
  WhatsApp line **+62 817-6917-122**, model `google/gemini-2.5-flash`.
- Charlie's whole behaviour is in `/opt/.openclaw-chs/workspace-charlie/AGENTS.md`. To change the
  verification wording / sender org / language, edit that file then
  `systemctl --user restart openclaw-chs-gateway.service`.

## Guardrails

- gda-ai01 runs **7 other production agent instances**. Only ever touch `chs`-named files/services/ports.
  Never edit another instance's `openclaw.json`, workspace, unit, or nginx block.
- Validate before reload: `sudo nginx -t` before `sudo systemctl reload nginx`.
- Don't print secrets (gateway tokens, API keys, WhatsApp session creds) into shared output.
- Access for editing/ops: `ssh gda-ai01` (user azlan, key `~/.ssh/id_ed25519_gaia`).

## Common commands (run on gda-ai01)

```bash
# health
systemctl --user status openclaw-chs-gateway.service --no-pager
ss -ltnp | grep 19389
# logs
journalctl --user -u openclaw-chs-gateway.service -f
# restart after editing config or Charlie's workspace
systemctl --user restart openclaw-chs-gateway.service
# link / relink WhatsApp (+62 817-6917-122 scans the QR)
OPENCLAW_CONFIG_PATH=/opt/.openclaw-chs/openclaw.json OPENCLAW_STATE_DIR=/opt/.openclaw-chs \
  node /home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js channels login --channel whatsapp
```
