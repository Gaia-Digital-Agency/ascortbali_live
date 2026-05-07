# Phase 01 Move Summary (Steps 1-6)

Date: 2026-02-08
Project: `gda-viceroy`
App: `baligirls`
VM: `gda-s01` (`34.124.244.233`)
Staging URL: `http://34.124.244.233/baligirls`
API URL: `http://34.124.244.233/baligirls/api`

## Step 1 - Pre-flight and validation

- Verified shared VM layout and existing apps in `/var/www`.
- Confirmed `baligirls` path and app identity.
- Replaced route `/03staging` with `/baligirls`.
- Confirmed no disruption to other active app (`whatsnewasia`).

## Step 2 - Production runtime on staging

- Synced code to `/var/www/baligirls`.
- Installed/validated runtime stack: Node 20, pnpm, PM2.
- Built API and Web successfully.
- Started services with PM2 on isolated ports:
  - API: `127.0.0.1:8001`
  - Web: `127.0.0.1:3001`
- Updated Nginx proxy routing for path-based hosting.

## Step 3 - Cloud SQL migration

- Enabled Cloud SQL API in project.
- Connected staging VM to Cloud SQL instance `baligirls`.
- Authorized staging VM IP for DB access.
- Created database `ascortbali`.
- Ran DB scripts:
  - `database/migrate.py`
  - `database/seed.py`
- Reconciled schema requirements so API endpoints are stable on Cloud SQL.
- Verified API health and service endpoints are returning `200`.

## Step 4 - CORS

- Set API CORS to staging origin `http://34.124.244.233`.
- Verified preflight responses:
  - Allowed origin is echoed.
  - Disallowed origin is not echoed.

## Step 5 - Upload storage to GCS

- Replaced local `public/uploads` writes with Google Cloud Storage.
- Implemented upload route + retrieval route via app API.
- Updated Nginx routing so Next upload routes go to Web service.
- Corrected actual bucket name to `gda-s01-bucket`.
- Verified end-to-end upload and retrieval (`200`) and object presence in bucket.

## Step 6 - Secrets handling

- Enabled Secret Manager API.
- Created staging secrets for DB URL/password, JWT keys, and analytics HMAC.
- Granted Secret Manager accessor role to VM service account.
- Restarted API using secret-backed injected runtime values.
- Sanitized API `.env` to non-secret settings only.

## Conclusion

Phase 01 (Steps 1-6) is completed on staging.

Current staging status:

- Web and API are live and healthy under `/baligirls` and `/baligirls/api`.
- Database is on Cloud SQL and serving API traffic.
- Uploads are persisted in GCS (`gda-s01-bucket/baligirls/uploads`).
- Core secrets are stored in Secret Manager.

Remaining caveat before production hardening:

- VM OAuth scopes are still restricted, so direct secret fetch from VM is limited.
- Staging currently relies on injected runtime secrets and a file-based GCS credential path.
- Production follow-up is documented in `gcp_move/gcp_move.md` under caveat resolution.
