# GCP Secrets and Env Inventory (Staging)

Last updated: 2026-02-08

## Warning

This file contains sensitive values for staging. Do not use this storage approach for production secrets.

## Project and Access

- Project ID: `gda-viceroy`
- VM: `gda-s01` (`34.124.244.233`)
- SSH: `ssh -i ~/.ssh/gda-ce01 azlan@34.124.244.233`

## Cloud SQL

- Instance: `baligirls`
- DB host: `136.110.3.46`
- DB name: `ascortbali`
- DB user: `postgres`
- DB password: `password123`
- DATABASE_URL:
  - `postgresql://postgres:password123@136.110.3.46:5432/ascortbali?sslmode=require`

## API Runtime Env (Staging)

- `NODE_ENV=production`
- `PORT=8001`
- `HOST=127.0.0.1`
- `DATABASE_URL=postgresql://postgres:password123@136.110.3.46:5432/ascortbali?sslmode=require`
- `JWT_ISSUER=ascortbali`
- `JWT_AUDIENCE=ascortbali-web`
- `JWT_ACCESS_TTL_SECONDS=900`
- `JWT_REFRESH_TTL_SECONDS=2592000`
- `JWT_PRIVATE_KEY_PEM=`
  - `-----BEGIN PRIVATE KEY-----`
  - `MC4CAQAwBQYDK2VwBCIEIALppVaMFb2+/Sr20NQHsp8/jmW9n6i7q15bSVArSUEE`
  - `-----END PRIVATE KEY-----`
- `JWT_PUBLIC_KEY_PEM=`
  - `-----BEGIN PUBLIC KEY-----`
  - `MCowBQYDK2VwAyEAlldxgyjpkV4PVyY73rhUbRtASPKB69Qc1NJtffBczFs=`
  - `-----END PUBLIC KEY-----`
- `ANALYTICS_HMAC_SECRET=ascortbali_dev_hmac_secret_key_2024`
- `CORS_ORIGIN=http://34.124.244.233`

## Web Runtime Env (Staging)

- `NEXT_PUBLIC_API_BASE_URL=http://34.124.244.233/baligirls/api`
- `NEXT_PUBLIC_BASE_PATH=/baligirls`
- `NEXT_BASE_PATH=/baligirls`
- `GCS_BUCKET_NAME=gda-s01-bucket`
- `GCS_UPLOAD_PREFIX=baligirls/uploads`
- `GOOGLE_APPLICATION_CREDENTIALS=/var/www/baligirls/.secrets/gda-s01-storage-key.json`

## GCS

- Bucket: `gda-s01-bucket`
- Upload prefix: `baligirls/uploads/`
- Example uploaded object:
  - `gs://gda-s01-bucket/baligirls/uploads/1770539108562-e9879c20.jpg`

## Secret Manager Secret IDs

- `baligirls-stg-database-url`
- `baligirls-stg-db-password`
- `baligirls-stg-jwt-private-key-pem`
- `baligirls-stg-jwt-public-key-pem`
- `baligirls-stg-analytics-hmac-secret`

## Current Caveat

- VM OAuth scopes are restricted; direct VM fetch from Secret Manager currently fails with `ACCESS_TOKEN_SCOPE_INSUFFICIENT`.
- Secrets are currently injected into runtime env during deployment/restart.
