# CLAUDE.md

Orientation for Claude Code working in this repo. For full product/infra context read [README.md](README.md) — this file only covers what's not obvious from reading the code.

## What this is

**Baligirls** — a multi-role marketplace (users, creators, admin CMS) with image upload, optional WhatsApp 2FA, served at `https://baligirls.gaiada2.online`. pnpm monorepo, two workspaces under `app/*`.

- [app/api](app/api/) — Express + Prisma API on port **8001** (package `@ascortbali/api`)
- [app/web-vite](app/web-vite/) — Vite SPA + Express static/image server on port **8002** (package `@baligirls/web-vite`)
- Database: PostgreSQL 18.3, db name `ascortbali` (PG16 cluster on 5433 is an idle rollback)
- Media: Google Cloud Storage, bucket `gda-ce01-bucket` (name kept post-migration)

There is **no SSR** — Vite produces a static SPA into `dist/client/`; [app/web-vite/server.ts](app/web-vite/server.ts) just serves it plus GCS-backed image routes and `/sitemap.xml`.

A legacy Next.js app under `app/web` was deleted 2026-04-29. Do all frontend work in [app/web-vite](app/web-vite/).

## Commands

```bash
pnpm install
pnpm -r build                                  # build both workspaces
pnpm -r typecheck                              # tsc --noEmit in both
pnpm -r lint                                   # eslint

# Dev
pnpm --filter @ascortbali/api dev              # API only (port 8001)
cd app/web-vite && pnpm dev                    # Vite dev server

# DB
cd app/api && pnpm db:migrate                  # prisma migrate dev
cd app/api && pnpm db:studio                   # prisma studio
```

## Source layout

```
app/api/src/
├── index.ts, router.ts
├── routes/        auth ads admin analytics blogs creators me orders services votes
├── lib/           pg jwt twilio otp env
├── middleware/    auth rateLimit
└── prisma.ts, types/

app/web-vite/src/
├── App.tsx, entry-client.tsx
├── pages/         Home, Admin*, Creator*, User*, Blog*, Privacy, Terms
├── components/    Layout, AuthNavButton, ...
└── lib/           api client, paths, utilities
```

The API uses a mix of **raw `$queryRawUnsafe`** (for legacy tables `providers`, `app_accounts`, etc.) and **typed Prisma** (for newer tables like `Service`). Match the surrounding style when extending a route.

## Production layout (gda-pn01)

- Production checkout: `/var/www/baligirls/` (this directory) — also the deploy target.
- Git operations happen from a separate clone at `/home/azlan/repos/baligirls/`. **This tree is not a git repo** — don't run `git` commands here expecting state.
- GitHub remote: `git@github.com:Gaia-Digital-Agency/baligirls.git` (main branch).
- File ownership is `azlan:www-data`; PM2 runs as user `azlan` (not `www-data`).
- PM2 processes: `baligirls-api` (cluster, 2 workers) and `baligirls-web-vite` (fork). Saved state in `/home/azlan/.pm2/dump.pm2` — there is no checked-in `ecosystem.config.js`.

```bash
sudo -u azlan pm2 restart baligirls-api baligirls-web-vite --update-env
sudo -u azlan pm2 logs baligirls-api --lines 100
sudo nginx -t && sudo nginx -s reload
```

Server access: `gda-pn01` is a GCE instance — use `gcloud compute ssh` / `gcloud compute scp`, not raw ssh against the public IP.

## Gotchas (the kind that bite)

- **`WHATSAPP_2FA_ENABLED` is parsed as an explicit string match** in [app/api/src/lib/env.ts](app/api/src/lib/env.ts). Do **not** revert to `z.coerce.boolean()` — it treats `"false"` as `true` because `Boolean("false") === true`. Production currently has 2FA **disabled** (`WHATSAPP_2FA_ENABLED=false`).
- **GCS uploads need the JSON key**, not the VM's default service account. The default compute SA on `gda-pn01` has `devstorage.read_only` only and will fail uploads with `Provided scope(s) are not authorized`. Set `GOOGLE_APPLICATION_CREDENTIALS=/etc/gda-credentials/gda-viceroy-17373de6d690.json` (mode 600). Already wired in [app/web-vite/.env](app/web-vite/.env).
- **GCS routes live on the web-vite server (8002), not the API**: `/api/upload`, `/api/uploads/*`, `/api/admin-asset/*`, `/api/clean-image/*`, `/api/static/*`. nginx routes them explicitly. Everything else under `/api/*` goes to the API on 8001.
- **`/assets/*` is served by nginx directly** from `dist/client/assets/` with an immutable 1-year cache. After a `vite build`, those hashed files must exist on disk before nginx will serve the new build.
- **Internal naming is still `ascortbali`** (package `@ascortbali/api`, DB `ascortbali`) even though the GitHub slug is `ascortbali_live`. Rename was intentionally deferred — don't "fix" it.
- **`pnpm-workspace.yaml` lists only `app/*`** — no `packages/` directory exists. Older README text mentioning `packages/*` is stale.
- **Maintenance gate is file-based**: `touch /var/www/baligirls/maintenance/.on` → nginx returns 503 to everyone except the bypass IP list (currently `194.5.82.35` and `127.0.0.1`). No reload needed. See [README.md](README.md) "Maintenance Mode".

## Reference docs in this repo

- [README.md](README.md) — full product, infra, endpoints, and migration history (canonical)
- [twilio_auth_guide.md](twilio_auth_guide.md) — WhatsApp 2FA setup
- [references/features/](references/features/) — Inventory, architecture, creator info, access info (test creds), TnC, features_api, report
- [cleanup_engine/](cleanup_engine/) — Python data tooling (scrapers, watermark removal). **Not part of the runtime**; safe to ignore for app-level changes.
