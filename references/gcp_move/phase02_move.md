# Phase 02 Move (baligirls): Step 08 to Step 10 + Link/Image Fixes

Date: 2026-02-08

Environment:
- Project: `gda-viceroy`
- VM: `gda-s01` (`34.124.244.233`)
- App base path: `/baligirls`
- Public staging URLs:
  - Web: `http://34.124.244.233/baligirls`
  - API: `http://34.124.244.233/baligirls/api`

## Step 08: Firewall And Network Hardening (Verified)

Goal:
- Expose only `80/443` publicly via NGINX.
- Keep app ports private.

Verification (on VM, 2026-02-08):
- Listeners:
  - Public: `0.0.0.0:80` (nginx), `0.0.0.0:22` (sshd)
  - Private loopback only:
    - Web: `127.0.0.1:3001`
    - API: `127.0.0.1:8001`
- Public reachability confirmed from admin laptop:
  - `curl -I http://34.124.244.233/baligirls` -> `HTTP/1.1 200 OK`
- Host firewall:
  - `ufw` inactive; `iptables` default ACCEPT policies (no host-level port 80 block observed).
- Notes:
  - `whatsnewasia` listens on `*:8080` but is intended to be accessed via NGINX at `/whatsnewasia/`.
  - VM has restricted OAuth scopes; running `gcloud compute firewall-rules list` from the VM fails with insufficient authentication scopes (so VPC firewall rule inspection must be done from an admin machine with proper credentials/scopes).
  - Codex sandbox may fail public `curl`/`nc` checks due to network/DNS restrictions; use the admin laptop for public reachability tests.

Conclusion:
- `baligirls` internal ports are not exposed publicly; access is correctly mediated via NGINX on port 80.

## Step 09: Stable Node Runtime (Verified)

Goal:
- Ensure Node runtime stability/consistency (Node 20 LTS line).

Verification (on VM, 2026-02-08):
- OS: Ubuntu `24.04.3 LTS` (noble)
- Node:
  - `which node` -> `/usr/bin/node`
  - `node -v` -> `v20.20.0`
- Package manager:
  - Repo root `package.json` pins `packageManager: pnpm@9.12.3`
  - Verified in `/var/www/baligirls`: `pnpm -v` -> `9.12.3` (Corepack)

Conclusion:
- Runtime is aligned to Node 20 and pnpm version is consistent with repo pin.

## Step 10: Cutover And Rollback (Prepared + Smoke Tested)

Goal:
- Have rollback artifacts and quick recovery commands.
- Smoke-test the routed application.

Rollback snapshot (on VM, 2026-02-08):
- NGINX site backup created:
  - `/etc/nginx/sites-enabled/gda-s01.bak.20260208T085042Z`
- PM2 state saved:
  - `pm2 save` -> `/home/azlan/.pm2/dump.pm2`

Smoke tests (via NGINX on VM, 2026-02-08):
- `GET /baligirls` -> `200`
- `GET /baligirls/api/health` -> `200`
- `GET /baligirls/api/services` -> `200`
- `GET /whatsnewasia/` -> `200`
- Note: `GET /whatsnewasia` (no trailing slash) -> `404` (expected with current backend/route behavior)

Rollback quick commands (VM):
```bash
# restore nginx site config
sudo cp -a /etc/nginx/sites-enabled/gda-s01.bak.20260208T085042Z /etc/nginx/sites-enabled/gda-s01
sudo nginx -t
sudo systemctl reload nginx

# restore PM2 processes (if needed)
pm2 resurrect
pm2 ls
```

Cutover prerequisites (still needed for a real production domain):
- Confirm final production domain(s) and DNS provider
- Lower DNS TTL prior to switching records (typical 300 seconds)
- Add HTTPS (LetsEncrypt or managed cert) and then force HTTP->HTTPS redirect

Conclusion:
- Rollback artifacts exist and smoke tests are passing on the current staging IP/base-path deployment.

## Post Step 10: Fixes For Login Redirects And Images (Implemented + Verified)

Issue A: `/admin`, `/user`, `/creator` sign-in did not land on logged-in pages.
- Root cause:
  - Client-side redirects used absolute paths like `/admin/logged`, which breaks when the app is mounted under base path `/baligirls`.
- Fix:
  - Added helper to prefix the base path at runtime:
    - `app/web/lib/paths.ts` (`withBasePath`)
  - Updated redirects (login + role guard + logout) to use `withBasePath(...)`:
    - `app/web/app/admin/page.tsx`
    - `app/web/app/user/page.tsx`
    - `app/web/app/creator/page.tsx`
    - `app/web/app/admin/logged/page.tsx`
    - `app/web/app/user/logged/page.tsx`
    - `app/web/app/creator/logged/page.tsx`
    - `app/web/components/AuthNavButton.tsx`

Issue B: Images not showing.
- Root cause:
  - Hardcoded `/api/...` image URLs (missing `/baligirls` base path).
  - Upload code path showed GCS errors: “The specified bucket does not exist.” This was traced to an incorrect default bucket being used when runtime env was not honored.
- Fixes:
  - Updated asset and clean-image URLs to use `withBasePath("/api/...")`:
    - `app/web/app/layout.tsx` (logo)
    - `app/web/components/AdvertisingSpaces.tsx` (fallback ads)
    - `app/web/app/page.tsx` (creator images)
    - `app/web/app/creator/logged/page.tsx` (creator panel images)
    - `app/web/app/creator/preview/[id]/page.tsx` (preview images)
  - Ensured GCS env vars are read at runtime (avoids build-time inlining surprises):
    - `app/web/lib/gcs.ts` now uses `process.env["GCS_BUCKET_NAME"]` and `process.env["GCS_UPLOAD_PREFIX"]`

Deployment actions (on VM, 2026-02-08):
- Updated web files under `/var/www/baligirls/app/web`
- Rebuilt web:
  - `pnpm --filter @ascortbali/web build`
- Restarted web process:
  - `pm2 restart baligirls-web --update-env`

Verification (on VM, 2026-02-08):
- Routes:
  - `GET /baligirls/admin` -> `200`
  - `GET /baligirls/user` -> `200`
  - `GET /baligirls/creator` -> `200`
  - `GET /baligirls/admin/logged` -> `200`
  - `GET /baligirls/user/logged` -> `200`
  - `GET /baligirls/creator/logged` -> `200`
- Assets:
  - `GET /baligirls/api/admin-asset/baligirls_logo.png` -> `200`
  - `GET /baligirls/api/clean-image/IM_835389_01.jpg` -> `200 image/jpeg`
- Auth:
  - `POST /baligirls/api/auth/login` -> `200` (JWT tokens returned)

Conclusion:
- Login redirect flow and image URLs now work correctly when mounted under `/baligirls`.

## Quick Test Links (Staging)

- Web home: `http://34.124.244.233/baligirls`
- Admin login: `http://34.124.244.233/baligirls/admin`
- User login: `http://34.124.244.233/baligirls/user`
- Creator login: `http://34.124.244.233/baligirls/creator`
- API health: `http://34.124.244.233/baligirls/api/health`
- API services: `http://34.124.244.233/baligirls/api/services`
- WhatsNewAsia (needs trailing slash): `http://34.124.244.233/whatsnewasia/`

