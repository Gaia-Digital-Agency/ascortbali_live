# Runbook — `.openclaw-chs`

All commands run on **gda-ai01** (`ssh gda-ai01`, user azlan) unless noted.

## 0. Two remaining steps to go live

### A. Point DNS at the right host (you, at GoDaddy)
`chs.gaiada.online` currently resolves to **34.124.244.233 (gda-s01)**. The gateway runs on
**gda-ai01**, so the panel must point there:

> Set the `chs.gaiada.online` **A record → 34.143.206.68** (gda-ai01).

Verify it propagated:
```bash
dig +short chs.gaiada.online      # expect 34.143.206.68
```

### B. Issue TLS (after DNS propagates)
```bash
sudo certbot --nginx -d chs.gaiada.online --non-interactive --agree-tos -m ai@gaiada.com --redirect
sudo nginx -t && sudo systemctl reload nginx
```
Then open `https://chs.gaiada.online/#token=<gateway token>` (token is in
`/opt/.openclaw-chs/openclaw.json`).

### C. Link WhatsApp (you, with the phone for +62 817-6917-122)
```bash
OPENCLAW_CONFIG_PATH=/opt/.openclaw-chs/openclaw.json OPENCLAW_STATE_DIR=/opt/.openclaw-chs \
  node /home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js channels login --channel whatsapp
```
A QR prints in the terminal. On the phone: **WhatsApp → Settings → Linked Devices → Link a device →
scan**. Confirm it linked:
```bash
OPENCLAW_CONFIG_PATH=/opt/.openclaw-chs/openclaw.json OPENCLAW_STATE_DIR=/opt/.openclaw-chs \
  node /home/azlan/.npm-global/lib/node_modules/openclaw/dist/index.js channels status
```

## 1. Use it
In Mission Control, type:
```
Charlie verify +628176917122
```
Charlie WhatsApps that number a YES/NO confirmation, then reports the verdict back to you.

## 2. Ops
```bash
systemctl --user status openclaw-chs-gateway.service --no-pager   # health
ss -ltnp | grep 19389                                             # listener
journalctl --user -u openclaw-chs-gateway.service -f              # logs
systemctl --user restart openclaw-chs-gateway.service             # restart
```

## 3. Change Charlie's behaviour / wording
Edit `/opt/.openclaw-chs/workspace-charlie/AGENTS.md` (the verification message text, sender org,
language rules all live there), then restart the service.

## 4. Access the panel before DNS/TLS (test today)
SSH-tunnel the loopback gateway to your laptop:
```bash
ssh -L 19389:127.0.0.1:19389 gda-ai01
# then browse to:  http://localhost:19389/#token=<gateway token>
```

## 5. Troubleshooting
- **Panel won't load / 502** → gateway down: `systemctl --user restart openclaw-chs-gateway.service`.
- **Gateway slow to bind after start** → host is busy; the listener can take ~20s to appear on :19389.
- **"unauthorized: gateway token mismatch"** → use the `#token=` from `openclaw.json`.
- **Charlie can't send WhatsApp** → account not linked or session dropped; re-run step C.
- **certbot fails** → DNS not yet pointing to 34.143.206.68; re-check `dig +short chs.gaiada.online`.

## 6. Teardown (if ever needed)
```bash
systemctl --user disable --now openclaw-chs-gateway.service
rm ~/.config/systemd/user/openclaw-chs-gateway.service && systemctl --user daemon-reload
sudo rm -rf /opt/.openclaw-chs
# remove the chs server block from /etc/nginx/sites-available/openclaw, then: sudo nginx -t && sudo systemctl reload nginx
```
