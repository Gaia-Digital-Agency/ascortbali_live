# GCP Move Checklist (baligirls)

This checklist is for the GCP deployment environment (not local development).

Scope and safety rules:
- This VM hosts multiple apps. Do not modify shared/default config blindly.
- Only change assets for `baligirls`.
- If another app name/path appears, verify before editing or restarting anything.

Environment baseline:
- Project ID: `gda-viceroy`.
- VM: `gda-s01`.
- SSH: `ssh -i ~/.ssh/gda-ce01 azlan@34.124.244.233`.
- Target path: `/var/www/baligirls`.
- Zone: `asia-southeast1-b`.
- Bucket: `gda-s01-bucket`, prefix `baligirls/`.
- Cloud SQL PostgreSQL instance: `baligirls`.
- Staging URL:
  - web: `http://34.124.244.233/baligirls`
  - api: `http://34.124.244.233/baligirls/api`

## Step 1 Status (verified on VM: 2026-02-08)

- `hostname`: `gda-s01.asia-southeast1-b.c.gda-viceroy.internal`.
- Existing `/var/www` apps: `02staging`, `ascortbali`, `baligirls`, `html`, `whatsnewasia`.
- Current `/var/www/baligirls` contains only placeholder `index.html` (no deployed app yet).
- Active Node process found:
  - `whatsnewasia` on port `8080`.
- NGINX route updated:
  - `/03staging` replaced by `/baligirls`.
- Initial proxy baseline confirmed for `baligirls`:
  - `/baligirls` -> `127.0.0.1:3001`
  - `/baligirls/api` -> `127.0.0.1:8001`
- Name conflict found in notes: `baligilrs` typo appears once. Use `baligirls` only.

## Step 2 Status (completed on staging: 2026-02-08)

- Code synced to `/var/www/baligirls`.
- Runtime on VM:
  - Node `v20.20.0`
  - PM2 active
  - PNPM installed (`9.12.3`)
- Build completed:
  - API TypeScript build
  - Web Next.js production build
- PM2 services running:
  - `baligirls-api` on `127.0.0.1:8001`
  - `baligirls-web` on `127.0.0.1:3001`
  - existing `whatsnewasia` remains online (untouched)
- Local VM checks:
  - `http://127.0.0.1:8001/health` -> `200`
  - `http://127.0.0.1:3001/baligirls` -> `200`
- Public staging checks:
  - `http://34.124.244.233/baligirls` -> `200`
  - `http://34.124.244.233/baligirls/api/health` -> `200`

## Step 3 Status (completed on staging: 2026-02-08)

- Cloud SQL discovery and access:
  - Enabled `sqladmin.googleapis.com` in project `gda-viceroy`.
  - Confirmed instance: `baligirls` (`asia-southeast1`), public IP `136.110.3.46`.
  - Added authorized network: `34.124.244.233/32` (staging VM public IP).
- Database setup:
  - Created DB `ascortbali` on instance `baligirls`.
  - Ran:
    - `python3 database/migrate.py` -> success
    - `python3 database/seed.py` -> success
      - seeded providers/images and base app rows.
  - Applied additional Prisma model tables (additive, no destructive drop of legacy tables).
- App env (staging):
  - API `DATABASE_URL` points to Cloud SQL (`sslmode=require`).
  - API `CORS_ORIGIN=http://34.124.244.233`.
  - Web `NEXT_PUBLIC_API_BASE_URL=http://34.124.244.233/baligirls/api`.
- Validation:
  - `GET /baligirls/api/health` -> `200`.
  - `GET /baligirls/api/services` -> `200` with JSON payload.
  - PM2 processes stable (`baligirls-api`, `baligirls-web`, `whatsnewasia` all online).
- Security follow-up:
  - Current DB password is still temporary and must be rotated.
  - Prefer private Cloud SQL connectivity (or Auth Proxy) before production cutover.

## Step 4 Status (completed on staging: 2026-02-08)

- API CORS configured to staging web origin:
  - `CORS_ORIGIN=http://34.124.244.233`
- Verified preflight behavior:
  - `Origin: http://34.124.244.233` -> `Access-Control-Allow-Origin: http://34.124.244.233`
  - Unapproved origin does not get echoed in `Access-Control-Allow-Origin`.
- Verified both direct API and NGINX-routed API:
  - `http://127.0.0.1:8001/services` (direct)
  - `http://127.0.0.1/baligirls/api/services` (through NGINX)

## Step 5 Status (completed on staging: 2026-02-08)

- Upload storage moved from local filesystem to GCS.
- Implemented server-side upload/write path:
  - `POST /baligirls/api/upload` (Next route) writes to GCS object path:
    - `gs://gda-s01-bucket/baligirls/uploads/...`
- Implemented file read/serve path:
  - `GET /baligirls/api/uploads/<object-key>` reads from GCS and streams via app.
- NGINX updated so specific Next API routes are not swallowed by backend API proxy:
  - routed to web service (`127.0.0.1:3001`):
    - `/baligirls/api/upload`
    - `/baligirls/api/uploads`
    - `/baligirls/api/admin-asset`
    - `/baligirls/api/clean-image`
  - backend API remains on (`127.0.0.1:8001`) for other `/baligirls/api/*`.
- Staging runtime env for web includes:
  - `GCS_BUCKET_NAME=gda-s01-bucket`
  - `GCS_UPLOAD_PREFIX=baligirls/uploads`
  - `GOOGLE_APPLICATION_CREDENTIALS=/var/www/baligirls/.secrets/gda-s01-storage-key.json`
- Validation:
  - Upload response returns URL under `/baligirls/api/uploads/...`
  - Uploaded file fetch returns `200` locally and publicly.
  - Object confirmed in bucket:
    - `gs://gda-s01-bucket/baligirls/uploads/1770539108562-e9879c20.jpg`

## Step 6 Status (completed on staging: 2026-02-08)

- Secret Manager enabled in project `gda-viceroy`.
- Added/updated staging secrets:
  - `baligirls-stg-database-url`
  - `baligirls-stg-db-password`
  - `baligirls-stg-jwt-private-key-pem`
  - `baligirls-stg-jwt-public-key-pem`
  - `baligirls-stg-analytics-hmac-secret`
- Granted VM service account access (`roles/secretmanager.secretAccessor`) on the above secrets.
- API runtime restarted with secret-backed env values.
- Sanitized API dotenv file to non-secret values only:
  - `/var/www/baligirls/app/api/.env` now keeps only non-secret runtime config.
- Verification:
  - `GET /health` -> `200`
  - `GET /baligirls/api/services` -> `200`
- Current VM limitation:
  - VM OAuth scopes are still restricted (`devstorage.read_only` baseline), so direct `gcloud secrets versions access ...` from VM fails with `ACCESS_TOKEN_SCOPE_INSUFFICIENT`.
  - Current staging runtime uses injected env values sourced from Secret Manager during deployment.

## Step 7 Status (completed on staging: 2026-02-08)

- Verified VM listeners:
  - Public: `80` (nginx), `22` (ssh)
  - Private loopback only:
    - API `127.0.0.1:8001`
    - Web `127.0.0.1:3001` (updated from `*:3001` to reduce lateral movement)
- Verified app still works after binding internal ports to loopback:
  - `GET /baligirls` -> `200`
  - `GET /baligirls/api/health` -> `200`
- Note (GCP firewall):
  - No public firewall rule is required for ports `3001`/`8001`; they remain internal-only behind NGINX.

Security note:
- Database password is now stored in Secret Manager, but still uses the temporary value and must be rotated before production cutover.

## Step 8 Status (verified on staging: 2026-02-08)

- Verified only NGINX (`:80`) and SSH (`:22`) are intended to be reachable publicly.
- Verified public reachability from admin laptop:
  - `curl -I http://34.124.244.233/baligirls` -> `HTTP/1.1 200 OK` (2026-02-08)
- Verified `baligirls` app ports are private (loopback only):
  - Web: `127.0.0.1:3001`
  - API: `127.0.0.1:8001`
- Verified external access to internal app ports is blocked from the admin machine:
  - `34.124.244.233:3001` -> not reachable
  - `34.124.244.233:8001` -> not reachable
- Note (this Codex environment):
  - Public `curl`/`nc` checks may fail due to sandbox network/DNS restrictions; use the admin laptop to validate public reachability.
- Note (shared VM):
  - `whatsnewasia` still listens on `*:8080` but is routed through NGINX at `/whatsnewasia`.
  - GCP firewall verification via `gcloud compute firewall-rules list` is currently blocked from the VM due to restricted OAuth scopes (`insufficient authentication scopes`).

## Step 9 Status (verified on staging: 2026-02-08)

- VM OS: Ubuntu `24.04.3 LTS` (noble).
- System Node.js:
  - `which node` -> `/usr/bin/node`
  - `node -v` -> `v20.20.0` (Node 20 LTS line)
- Package manager consistency:
  - Repo `package.json` pins `packageManager: pnpm@9.12.3`
  - Verified on VM in `/var/www/baligirls`: `pnpm -v` -> `9.12.3` via Corepack

## Step 10 Status (prepared on staging: 2026-02-08)

- Rollback snapshot captured on VM:
  - NGINX site backup created:
    - `/etc/nginx/sites-enabled/gda-s01.bak.20260208T085042Z`
  - PM2 state saved:
    - `pm2 save` -> `/home/azlan/.pm2/dump.pm2`
- Smoke tests (via NGINX on VM):
  - `GET /baligirls` -> `200`
  - `GET /baligirls/api/health` -> `200`
  - `GET /baligirls/api/services` -> `200`
  - `GET /whatsnewasia/` -> `200` (note: `/whatsnewasia` without trailing slash returns `404`)
- Cutover prerequisites (still needed):
  - Confirm the production domain(s) and DNS provider.
  - Lower DNS TTL before switching records (typical: 300 seconds).

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

## Caveat Note

- This is a shared VM with multiple apps. Avoid VM-wide disruptive changes unless scheduled.
- Current VM OAuth scopes are restricted, so direct Secret Manager reads from VM fail (`ACCESS_TOKEN_SCOPE_INSUFFICIENT`).
- Current staging therefore injects secrets at deploy/restart time.
- Current staging upload path uses a file credential:
  - `/var/www/baligirls/.secrets/gda-s01-storage-key.json`
  This is acceptable for staging only; production should use workload identity or proper VM scopes and remove file-based keys.

## Resolve Caveat Later (Production Plan)

1. Schedule a maintenance window for shared VM changes.
2. Stop VM `gda-s01` and update service account scopes to include `cloud-platform` (or at minimum scopes required for Secret Manager + GCS read/write).
3. Start VM and verify:
  - `gcloud secrets versions access latest --secret <id>` works on VM
  - GCS upload/write works without key file.
4. Move runtime startup to fetch secrets directly from Secret Manager at boot/restart (no plaintext in `.env`).
5. Remove file credential and cleanup:
  - delete `/var/www/baligirls/.secrets/gda-s01-storage-key.json`
  - revoke/delete the temporary service-account key in IAM.
6. Rotate all staging secrets after migration:
  - DB password
  - JWT private/public keys
  - `ANALYTICS_HMAC_SECRET`
7. Re-test full app flow and confirm other VM apps (`whatsnewasia`, etc.) remain unaffected.

Exact command sequence (run from trusted admin machine):

```bash
# 0) Set context
PROJECT_ID="gda-viceroy"
ZONE="asia-southeast1-b"
INSTANCE="gda-s01"
SA_EMAIL="292070531785-compute@developer.gserviceaccount.com"

# 1) Stop VM (shared VM downtime starts here)
gcloud compute instances stop "$INSTANCE" \
  --zone "$ZONE" \
  --project "$PROJECT_ID"

# 2) Update SA scopes (recommended: cloud-platform)
gcloud compute instances set-service-account "$INSTANCE" \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --service-account "$SA_EMAIL" \
  --scopes=https://www.googleapis.com/auth/cloud-platform

# 3) Start VM
gcloud compute instances start "$INSTANCE" \
  --zone "$ZONE" \
  --project "$PROJECT_ID"
```

Post-change verification commands:

```bash
# On VM: Secret Manager access should work now
gcloud secrets versions access latest \
  --secret=baligirls-stg-database-url \
  --project gda-viceroy

# On VM: GCS access should work without key file
gcloud storage ls gs://gda-s01-bucket --project gda-viceroy
```

## 1) Pre-flight and identity validation (start here)

- Confirm exact app identifier is `baligirls` in all deployment assets.
- Confirm exact GCP project ID (not only display name).
- Confirm zone format (`asia-southeast2-b`) and instance mappings.
- Confirm final production domain(s):
  - web domain
  - API domain (or path-based `/api` on same host)
- SSH to VM and collect a no-impact inventory:
  - existing `/var/www/*` app directories
  - enabled NGINX sites and upstream ports
  - active firewall rules relevant to VM ingress
- Reserve dedicated internal ports for this app only (example):
  - web: `3001`
  - api: `8001`

## 2) Run production mode (not dev)

- Build:
  - `pnpm -r build`
- Start API:
  - `pnpm --filter @ascortbali/api start`
- Start Web:
  - `pnpm --filter @ascortbali/web start`
- Use a process manager (`pm2` or `systemd`) so services auto-restart.

## 3) Configure NGINX + HTTPS

- Create a dedicated NGINX site config for `baligirls` only.
- Route:
  - web app to Next.js service port
  - API paths (`/api`) to Express API service port
- Validate config before reload:
  - `nginx -t`
- Enable HTTPS certificate (Let's Encrypt or managed cert).
- Force HTTP -> HTTPS redirect after successful cert and route validation.

## 4) Point database to Cloud SQL

- Set `DATABASE_URL` to Cloud SQL Postgres.
- Prefer private networking / Cloud SQL connector over public exposure.
- Run once on GCP target DB:
  - `python3 database/migrate.py`
  - `python3 database/seed.py`

## 5) Set CORS for real domain

- In API env:
  - `CORS_ORIGIN=https://<your-web-domain>`
- Must match actual web URL exactly.

## 6) Move uploads to Cloud Storage

- Current upload route stores files locally in `public/uploads`.
- For production durability, switch uploads to Google Cloud Storage bucket.
- Use:
  - bucket `gda-s01`
  - prefix `baligirls/`

## 7) Store secrets securely

- Put DB password, JWT keys, and `ANALYTICS_HMAC_SECRET` in Secret Manager.
- Avoid committing production secrets in files/repo.
- Rotate known temporary password immediately before go-live.

## 8) Firewall and network hardening

- Publicly expose only required ports (typically `80`/`443`).
- Keep app/backend/internal ports private.
- Restrict DB access to private VPC/private IP.
- Re-check that other VM apps remain reachable after rule updates.

## 9) Use stable Node runtime

- Use Node 20 LTS on GCP server.
- Keep Node version consistent across deploy/restart scripts.

## 10) Cutover and rollback

- Before cutover:
  - lower DNS TTL
  - run smoke tests against domain and API
- Cutover:
  - switch DNS
  - verify login, API, uploads, DB writes, CORS
- Rollback readiness:
  - keep previous NGINX config and app release path
  - define rollback triggers (e.g., sustained 5xx/auth failures)
  - keep rollback commands documented and tested

## Notes

- Local and GCP can coexist with separate `.env` values.
- Use:
  - `app/api/.env.gcp.example`
  - `app/web/.env.gcp.example`
  as templates for production env setup.
