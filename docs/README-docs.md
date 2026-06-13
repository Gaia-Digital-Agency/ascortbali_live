# verification — `.openclaw-chs` (Charlie)

A single-purpose OpenClaw instance whose agent **Charlie** verifies WhatsApp numbers on
command from Mission Control (the OpenClaw control panel).

## What it does

```
You (Mission Control)            Charlie (agent)                 Number owner (WhatsApp)
─────────────────────            ───────────────                 ───────────────────────
"Charlie verify +628…"   ──▶
                                 sends WhatsApp:  ──────────────▶ "Confirm this number is
                                 "confirm this number              yours? Reply YES/NO"
                                  belongs to you, YES/NO"
                                                  ◀────────────── "YES"
                                 replies "✅ you are verified"
        "+628… → VERIFIED ✅" ◀──
```

You type **`Charlie verify <phone_number>`** in the panel; Charlie WhatsApps the number a
YES/NO confirmation, waits for the reply, tells the owner they're verified on a YES, and
reports the verdict back to you.

## Where it lives

| Thing | Value |
|---|---|
| Host | `gda-ai01` (34.143.206.68) |
| Instance dir | `/opt/.openclaw-chs` |
| Agent | **Charlie** (acp default agent `main`), workspace `/opt/.openclaw-chs/workspace-charlie` |
| Model | `google/gemini-2.5-flash` (fallback `deepseek/deepseek-chat`), keys from `/opt/.openclaw-keys.env` |
| Gateway | systemd user service `openclaw-chs-gateway.service`, loopback port **19389** |
| WhatsApp line | **+62 817-6917-122** (linked via OpenClaw WhatsApp Web) |
| Mission Control | `https://chs.gaiada.online` (nginx on gda-ai01 → loopback 19389) |
| Gateway token | stored in `/opt/.openclaw-chs/openclaw.json` (`gateway.auth.token`) |

## Status (2026-06-12)

- ✅ Instance, agent, config, systemd service created and **running** (bound on 19389).
- ✅ nginx vhost staged + reloaded.
- ⏳ **TLS pending DNS** — `chs.gaiada.online` resolves to `34.124.244.233` (gda-s01); it must
  point to **gda-ai01 `34.143.206.68`** before certbot can issue the cert. See `docs/runbook.md`.
- ⏳ **WhatsApp not yet linked** — scan the QR with +62 817-6917-122. See `docs/runbook.md`.

## Repo contents

- `bootstrap-chs.sh` — the script that creates the instance on gda-ai01 (idempotent guard).
- `docs/architecture.md` — how the instance is wired into the OpenClaw fleet.
- `docs/runbook.md` — DNS, TLS, WhatsApp linking, ops commands, troubleshooting.
- `docs/verify-flow.md` — Charlie's exact verification behaviour (mirrors his `AGENTS.md`).
- `CLAUDE.md` — playbook for future Claude sessions working on this instance.
