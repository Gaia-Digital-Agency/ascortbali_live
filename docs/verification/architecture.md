# Architecture — `.openclaw-chs`

## Fleet context

`gda-ai01` hosts a fleet of OpenClaw agent instances, one per business function. Each is an
independent `openclaw-gateway` process bound to its own loopback port, fronted by nginx, with its
own WhatsApp/chat channels and its own agent workspace(s). `.openclaw-chs` (Charlie) is the
verification instance added on 2026-06-12.

```
                          gda-ai01 (34.143.206.68)
┌──────────────────────────────────────────────────────────────────────┐
│  nginx :443 ──(host chs.gaiada.online)──▶ 127.0.0.1:19389              │
│                                              │                         │
│                         openclaw-chs-gateway.service (systemd --user)  │
│                                              │                         │
│                                   Charlie (agent "main")               │
│                                   workspace-charlie/*.md                │
│                                              │                         │
│        ┌─────────────────────────────────────┴───────────────┐        │
│   Control UI (Mission Control)                      WhatsApp channel    │
│   operator chats here                               account "main"      │
│                                                     line +62 817-6917-122│
└──────────────────────────────────────────────────────────────────────┘
        ▲                                                    │
        │ operator                                  WhatsApp │ (Baileys / WA Web)
   "Charlie verify +628…"                                    ▼
                                                     number owner's phone
```

## Pieces

| Layer | Detail |
|---|---|
| Process | `node …/openclaw/dist/index.js gateway --port 19389`, `Restart=always` |
| Config | `/opt/.openclaw-chs/openclaw.json` — one agent (`main` = Charlie), whatsapp channel enabled, gateway loopback :19389, controlUi origin `https://chs.gaiada.online` |
| Agent brain | `/opt/.openclaw-chs/workspace-charlie/AGENTS.md` + IDENTITY/SOUL/SKILLS/TOOLS/USER/HEARTBEAT/MEMORY |
| Memory | sqlite at `/opt/.openclaw-chs/memory/{agentId}.sqlite` (verification log) |
| WhatsApp creds | `/opt/.openclaw-chs/credentials/whatsapp/main/` (created on QR link) |
| Model | `google/gemini-2.5-flash` primary, `deepseek/deepseek-chat` fallback; keys from `/opt/.openclaw-keys.env` |

## Why a single agent

The task is one tight loop (send → await reply → classify → report). No sub-agents are needed, so
`main` *is* Charlie and the operator talks to him directly in Mission Control. The WhatsApp account
is also "Charlie", so outbound verification messages and the panel persona are one identity.

## Cross-channel correlation

Two channels meet inside one agent: the operator's Control-UI session and the target's WhatsApp DM
session (`dmScope: per-channel-peer`). Charlie bridges them via memory — he records each pending
number, then on the WhatsApp reply looks it up, replies to the owner, and reports back to the
operator. The verification log in memory is the source of truth for "status of <number>" queries.
