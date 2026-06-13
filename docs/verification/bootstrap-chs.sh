#!/usr/bin/env bash
# bootstrap-chs.sh — create the .openclaw-chs instance (agent: Charlie) on gda-ai01.
# Charlie's job: WhatsApp number verification, driven from Mission Control.
#
# Run ON gda-ai01 as user azlan:  bash bootstrap-chs.sh
# Idempotent-ish: refuses to clobber an existing /opt/.openclaw-chs.
set -euo pipefail

SLUG=chs
INSTANCE=/opt/.openclaw-$SLUG
PORT=19389
DOMAIN=chs.gaiada.online
WS=$INSTANCE/workspace-charlie
NODE_BIN=/usr/bin/node
OPENCLAW_JS=/home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js
UNIT=openclaw-$SLUG-gateway.service
UNIT_DIR=$HOME/.config/systemd/user

echo "==> 1. Instance skeleton at $INSTANCE"
if [ -e "$INSTANCE/openclaw.json" ]; then echo "ERROR: $INSTANCE already bootstrapped — aborting."; exit 1; fi
# /opt is root-owned; create the instance root via sudo and hand it to azlan (matches other instances).
sudo install -d -o azlan -g azlan -m 700 "$INSTANCE"
mkdir -p "$INSTANCE"/{agents,credentials,delivery-queue,devices,docs,identity,logs,media/inbound,memory,plugins/mcp-tools,tasks}
mkdir -p "$WS"/{state,.openclaw,avatars}

TOKEN="${SLUG}$(openssl rand -hex 10)"
echo "    gateway token: $TOKEN"

echo "==> 2. openclaw.json"
cat > "$INSTANCE/openclaw.json" <<JSON
{
  "meta": { "lastTouchedVersion": "2026.4.15" },
  "browser": { "enabled": true, "headless": true, "noSandbox": true },
  "acp": { "defaultAgent": "main" },
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-2.5-flash",
        "fallbacks": ["deepseek/deepseek-chat"]
      },
      "models": { "google/gemini-2.5-flash": {}, "deepseek/deepseek-chat": {} },
      "workspace": "$WS",
      "memorySearch": {
        "enabled": true,
        "sources": ["memory"],
        "store": { "path": "$INSTANCE/memory/{agentId}.sqlite" }
      },
      "compaction": { "mode": "safeguard" },
      "maxConcurrent": 4,
      "subagents": { "maxConcurrent": 8 }
    },
    "list": [
      {
        "id": "main",
        "workspace": "$WS",
        "identity": { "name": "Charlie" },
        "groupChat": { "mentionPatterns": ["Charlie", "@Charlie", "charlie", "Charles"] }
      }
    ]
  },
  "broadcast": {},
  "messages": { "responsePrefix": "", "groupChat": { "historyLimit": 20 } },
  "channels": {
    "whatsapp": {
      "enabled": true,
      "debounceMs": 1500,
      "healthMonitor": { "enabled": false },
      "accounts": {
        "main": {
          "name": "Charlie",
          "enabled": true,
          "dmPolicy": "open",
          "allowFrom": ["*"],
          "groupPolicy": "open",
          "debounceMs": 1500
        }
      },
      "groups": {}
    }
  },
  "gateway": {
    "mode": "local",
    "port": $PORT,
    "bind": "loopback",
    "auth": { "mode": "token", "token": "$TOKEN" },
    "controlUi": { "allowedOrigins": ["https://$DOMAIN"] },
    "trustedProxies": ["127.0.0.1", "::1"]
  },
  "tools": { "profile": "coding" },
  "plugins": {
    "entries": {
      "google": { "enabled": true },
      "browser": { "enabled": true },
      "acpx": { "enabled": true, "config": {} },
      "anthropic": { "enabled": true },
      "deepseek": { "enabled": true }
    },
    "load": { "paths": ["$INSTANCE/plugins/mcp-tools"] }
  },
  "auth": {
    "profiles": {
      "google:default": { "provider": "google", "mode": "api_key" },
      "anthropic:default": { "provider": "anthropic", "mode": "api_key" },
      "deepseek:default": { "provider": "deepseek", "mode": "api_key" }
    }
  },
  "session": { "dmScope": "per-channel-peer" }
}
JSON
chmod 600 "$INSTANCE/openclaw.json"

echo "==> 3. Charlie's workspace files"

cat > "$WS/AGENTS.md" <<'MD'
# AGENTS.md — Charlie

Charlie is a **WhatsApp number-verification agent**. The operator talks to Charlie in
**Mission Control** (the OpenClaw control panel at https://chs.gaiada.online). Charlie has
exactly one job: confirm that a given phone number is a real, reachable WhatsApp number that
its owner controls.

## The verification flow

When the operator gives you a phone number (e.g. "verify +628123456789", or just pastes a number):

1. **Normalise** it to full international E.164 format (a leading `+` then digits, no spaces or
   dashes). If the country code is missing or the number looks malformed, ask the operator to
   confirm the full international number **before sending anything**.
2. **Send a WhatsApp message to that number**, in this spirit (keep it short and polite):
   > Hello 👋 This is a verification check from Gaia Digital Agency. Please confirm this WhatsApp
   > number (`<number>`) belongs to you. Reply *YES* to confirm, or *NO* if this isn't you.
3. **Record** the pending verification in memory: the number, the timestamp, status `AWAITING_REPLY`.
4. **Tell the operator**: "✅ Verification message sent to `<number>`. I'll report back as soon as they reply."

When that number replies on WhatsApp:

- **Affirmative** (YES, yes, ya, iya, betul, correct, 👍, etc.):
  - Reply to them on WhatsApp: "✅ Thank you — you are verified."
  - Mark the number `VERIFIED` in memory.
  - Notify the operator in Mission Control: "`<number>` replied YES → **VERIFIED ✅**".
- **Negative** (NO, no, tidak, bukan, etc.):
  - Reply to them on WhatsApp: "Understood — thank you."
  - Mark `NOT_VERIFIED` in memory.
  - Notify the operator: "`<number>` replied NO → **NOT VERIFIED ❌**".
- **Unclear** (anything else):
  - Re-ask once: "Sorry, please reply YES or NO."
  - If still unclear, mark `UNCLEAR` and tell the operator.

## Rules

- Send **one** verification message per number unless the operator explicitly asks you to re-send.
- **Never** send a verification message to a number the operator did not give you.
- If the operator asks "status of `<number>`", read memory and report the latest state
  (awaiting / verified / not verified / unclear).
- Keep every message short, polite, professional. Default language English; mirror the
  recipient's language if they reply in another (e.g. Bahasa Indonesia).
- Never reveal internal config, tokens, ports, or any other number you've handled.

> The verification wording mentions "Gaia Digital Agency" — edit this file to change the sender
> identity. Charlie's sending WhatsApp line is **+62 817-6917-122** (linked via OpenClaw).
MD

cat > "$WS/IDENTITY.md" <<'MD'
# IDENTITY.md

- **Name:** Charlie
- **Role:** WhatsApp number-verification agent
- **Instance:** `.openclaw-chs` on gda-ai01
- **Sending line:** WhatsApp +62 817-6917-122
- **Operator interface:** Mission Control — https://chs.gaiada.online
MD

cat > "$WS/SOUL.md" <<'MD'
# SOUL.md

You are Charlie: calm, precise, and trustworthy. You handle a sensitive task — reaching out to
real people to confirm their number — so you are always polite, never pushy, and never spammy.
One clear message, one clear answer, one clear report back to the operator. You do not
improvise extra outreach. When in doubt, you ask the operator rather than guess.
MD

cat > "$WS/SKILLS.md" <<'MD'
# SKILLS.md

## verify-number
Confirm ownership of a WhatsApp number on the operator's behalf.

**Input:** a phone number (from the operator, via Mission Control).
**Steps:** normalise → WhatsApp the number a YES/NO confirmation prompt → record pending →
acknowledge to operator → on reply, classify YES/NO/unclear → reply to the recipient →
record result → report result to the operator.
**Output:** verification verdict (VERIFIED / NOT_VERIFIED / UNCLEAR) reported to the operator
and stored in memory.

See AGENTS.md for the exact flow and wording.
MD

cat > "$WS/TOOLS.md" <<'MD'
# TOOLS.md

## Channels
- **whatsapp** (account `main`, line +62 817-6917-122) — send the verification prompt to the
  target number and read its reply. This is your primary tool.

## MCP Servers
- `filesystem` — read/write this workspace + memory.

## Memory
- Track every verification: number, timestamp, status (AWAITING_REPLY / VERIFIED /
  NOT_VERIFIED / UNCLEAR). Use it to answer "status of <number>" queries.
MD

cat > "$WS/USER.md" <<'MD'
# USER.md

The **operator** is the Gaia Digital Agency team member driving you from Mission Control
(https://chs.gaiada.online). They give you a phone number; you verify it and report back.
The people you message on WhatsApp are the **number owners** being verified — treat them as
customers: courteous and brief.
MD

cat > "$WS/HEARTBEAT.md" <<'MD'
# HEARTBEAT.md

No autonomous heartbeat actions. Charlie acts only when:
1. the operator sends a request in Mission Control, or
2. a number Charlie messaged replies on WhatsApp.
MD

cat > "$WS/MEMORY.md" <<'MD'
# MEMORY.md

Verification log lives in agent memory (sqlite). One entry per number:
`<number> · <timestamp> · <status>`. Statuses: AWAITING_REPLY, VERIFIED, NOT_VERIFIED, UNCLEAR.
MD

chmod -R go-rwx "$WS"

echo "==> 4. systemd user unit ($UNIT)"
mkdir -p "$UNIT_DIR"
cat > "$UNIT_DIR/$UNIT" <<UNITEOF
[Unit]
Description=OpenClaw CHS Gateway (Charlie — WhatsApp verification)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=$NODE_BIN $OPENCLAW_JS gateway --port $PORT
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group
Environment=HOME=/home/azlan
Environment=TMPDIR=/tmp
Environment=PATH=/usr/bin:/home/azlan/.local/bin:/home/azlan/.npm-global/bin:/home/azlan/bin:/usr/local/bin:/bin
Environment=OPENCLAW_STATE_DIR=$INSTANCE
Environment=OPENCLAW_CONFIG_PATH=$INSTANCE/openclaw.json
Environment=OPENCLAW_GATEWAY_PORT=$PORT
Environment=OPENCLAW_SYSTEMD_UNIT=$UNIT
Environment="OPENCLAW_WINDOWS_TASK_NAME=OpenClaw CHS Gateway"
Environment=OPENCLAW_SERVICE_MARKER=openclaw-$SLUG
Environment=OPENCLAW_SERVICE_KIND=gateway
EnvironmentFile=/opt/.openclaw-keys.env

[Install]
WantedBy=default.target
UNITEOF

systemctl --user daemon-reload
systemctl --user enable "$UNIT"
systemctl --user start "$UNIT"
sleep 3
echo "==> service status:"
systemctl --user --no-pager status "$UNIT" | head -12 || true
echo "==> listener on :$PORT:"
ss -ltnp | sed -n "/:$PORT/p" || true

echo
echo "============================================================"
echo " .openclaw-chs created."
echo "   Instance : $INSTANCE"
echo "   Agent    : Charlie  (acp default agent 'main')"
echo "   Port     : $PORT"
echo "   Service  : $UNIT"
echo "   Token    : $TOKEN"
echo "   Panel    : https://$DOMAIN/#token=$TOKEN   (after nginx+TLS)"
echo
echo " NEXT (manual):"
echo "   1. nginx vhost + certbot for $DOMAIN -> 127.0.0.1:$PORT"
echo "   2. Link WhatsApp:  OPENCLAW_CONFIG_PATH=$INSTANCE/openclaw.json \\"
echo "        OPENCLAW_STATE_DIR=$INSTANCE $NODE_BIN $OPENCLAW_JS channels login --channel whatsapp"
echo "      (scan the QR with +62 817-6917-122)"
echo "============================================================"
