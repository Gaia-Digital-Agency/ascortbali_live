# CLAUDE.md

Orientation for Claude Code working in this repo. For full product/infra context read [README.md](README.md) — this file only covers what's not obvious from reading the code.

## What this is

**Baligirls** — a multi-role marketplace (users, creators, admin CMS) with image upload and passwordless **WhatsApp OTP login** (delivered via the "Charles" relay — see **Authentication** below), served at `https://baligirls.gaiada2.online`. pnpm monorepo, two workspaces under `app/*`.

- [app/api](app/api/) — Express + Prisma API on port **8001** (package `@ascortbali/api`)
- [app/web-vite](app/web-vite/) — Vite SPA + Express static/image server on port **8002** (package `@baligirls/web-vite`)
- Database: PostgreSQL 18.3, db name `ascortbali` (PG16 cluster on 5433 is an idle rollback)
- Media: Google Cloud Storage, bucket `gda-ce01-bucket` (name kept post-migration)

**Project-root workspaces** (not in the live runtime):
- [cleanup_engine/](cleanup_engine/) — Python scrapers + watermark removal (legacy build pipeline)
- [database_engine/](database_engine/) — one-shot Postgres bootstrap (`migrate.py`, `seed.py`); **not used at runtime** — live schema is managed by Prisma
- [creator_engine/](creator_engine/) — per-batch creator-data ETL workspace. Tracked docs/scripts only: `cleanup.md` (12-step pipeline) + `import_baligirls.py`. PII (`bg_data_*.xlsx`, `creator_credentials.csv`, `images_*/`, `import_run/`) is gitignored
- [audit_engine/](audit_engine/) — per-run NSFW audit workspace (NudeNet against `gs://gda-ce01-bucket/baligirls/uploads/`). Entirely gitignored
- [maintenance/](maintenance/) — the `503` page + `.on` trigger file for the nginx maintenance gate
- [references/](references/) — Inventory, architecture, migration history, change-request docs

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
├── lib/           pg jwt twilio openclaw otp login2fa env
├── middleware/    auth rateLimit
└── prisma.ts, types/

app/web-vite/src/
├── App.tsx, entry-client.tsx
├── pages/         Home, Admin*, Creator*, User*, Blog*, Privacy, Terms
│   └── admin/     {Dashboard,Stats,Ads,Users,Creators}Tab + AccountEditModal +
│                  ImageAdEditor + types.ts + constants.ts. AdminLoggedPage.tsx
│                  is the orchestrator (state, handlers, sub-route switch).
├── components/    Layout, AuthNavButton, ...
└── lib/           api client, paths, utilities
```

The API uses a mix of **raw `$queryRawUnsafe`** (for legacy tables `providers`, `app_accounts`, etc.) and **typed Prisma** (for newer tables like `Service`). Match the surrounding style when extending a route.

## Authentication — WhatsApp OTP login (LIVE since 2026-06-20)

Passwordless login for **users + creators** (admin still uses username/password):

1. User enters their WhatsApp number → `POST /auth/login` ([routes/auth.ts](app/api/src/routes/auth.ts)). Looks up `app_accounts` (user) / `providers` (creator) by last-8 phone match; unknown number → register.
2. App generates a 6-digit code ([lib/login2fa.ts](app/api/src/lib/login2fa.ts) `createLoginSession` → DB table `login_2fa_sessions`, columns `code` + `attempts`, 5-min TTL, ≤5 attempts) and — when `OPENCLAW_OTP_ENABLED=true` — sends it via **Charles** ([lib/openclaw.ts](app/api/src/lib/openclaw.ts) `sendWhatsApp`). Response: `{twoFactorRequired, token, otpMethod:"whatsapp-code"}`. The `token` is the browser session id; the `code` is the secret (delivered only over WhatsApp).
3. **Charles** = OpenClaw `chs` instance on **gda-ai01** (WhatsApp line +62 817-6917-122). Delivery goes through the warm **`bg-otp-relay`** service (`/opt/.openclaw-chs/otp-relay`, systemd `--user`) over the **private VPC** at `http://10.148.0.7:19500/otp/send` — **not** `openclaw message send` (that cold-starts the CLI ~31s). Relay creds (`OTP_RELAY_URL` / `OTP_RELAY_TOKEN`) are in `app/api/.env`. **An OTP send uses 0 LLM tokens** — it's a pure WhatsApp channel send; the agent is never invoked (inbound is `dmPolicy=disabled`).
4. Frontend [LoginForm.tsx](app/web-vite/src/components/LoginForm.tsx) (`codeMode`) shows a 6-digit entry → `POST /auth/2fa/code/check` (`verifyOtpCode`) → access token.
5. **Fallbacks (coded):** if the relay send fails, `/login` returns `waNumber` for the older click-to-WhatsApp flow; Twilio Verify SMS endpoints (`/auth/2fa/sms/*`) still exist. The OTP code/migration: `app/api/scripts/migrate-otp-code-column.ts`.

## Production layout (gda-pn01)

- Production checkout: `/var/www/baligirls/` (this directory) — **also the live git repo** (branch `main`) and the deploy target. Commit/push from here.
- GitHub remote: `git@github.com:Gaia-Digital-Agency/ascortbali_live.git` (branch `main`). *(The old `/home/azlan/repos/baligirls` clone + `baligirls.git` remote are obsolete — this tree IS the repo.)*
- File ownership is `azlan:www-data`; PM2 runs as user `azlan` (not `www-data`).
- PM2 processes: `baligirls-api` (cluster, 2 workers) and `baligirls-web-vite` (fork). Saved state in `/home/azlan/.pm2/dump.pm2` — there is no checked-in `ecosystem.config.js`.

```bash
sudo -u azlan pm2 restart baligirls-api baligirls-web-vite --update-env
sudo -u azlan pm2 logs baligirls-api --lines 100
sudo nginx -t && sudo nginx -s reload
```

Server access: `gda-pn01` is a GCE instance — use `gcloud compute ssh` / `gcloud compute scp`, not raw ssh against the public IP.

## Gotchas (the kind that bite)

- **2FA env flags are explicit string matches** in [app/api/src/lib/env.ts](app/api/src/lib/env.ts) — do **not** revert to `z.coerce.boolean()` (`Boolean("false") === true`). Production has `WHATSAPP_2FA_ENABLED=true` **and** `OPENCLAW_OTP_ENABLED=true` → login OTP is delivered by **Charles** (see Authentication). Don't set `TWILIO_VERIFY_CHANNEL=whatsapp` (disabled, error 60223).
- **GCS uploads need the JSON key**, not the VM's default service account. The default compute SA on `gda-pn01` has `devstorage.read_only` only and will fail uploads with `Provided scope(s) are not authorized`. Set `GOOGLE_APPLICATION_CREDENTIALS=/etc/gda-credentials/gda-viceroy-17373de6d690.json` (mode 600). Already wired in [app/web-vite/.env](app/web-vite/.env).
- **GCS routes live on the web-vite server (8002), not the API**: `/api/upload`, `/api/uploads/*`, `/api/clean-image/*`, `/api/static/*` (the `/api/admin-asset/*` route was removed on 2026-04-29 — see [app/web-vite/server.ts](app/web-vite/server.ts) header comment). nginx routes each to 8002 with its own `location` block; everything else under `/api/*` falls through to the API on 8001. **If you add a new `/api/<thing>` handler in `web-vite/server.ts`, you MUST also add a matching `location /api/<thing>` block to `/etc/nginx/sites-enabled/baligirls` and `sudo nginx -s reload` — otherwise nginx will misroute it to the API and you'll see Express's HTML `Cannot GET /api/<thing>` instead of your JSON response.** This bit us on `/api/static/*` (added 2026-05-19).
- **`/assets/*` is served by nginx directly** from `dist/client/assets/` with an immutable 1-year cache. After a `vite build`, those hashed files must exist on disk before nginx will serve the new build.
- **Internal naming is still `ascortbali`** (package `@ascortbali/api`, DB `ascortbali`) even though the GitHub slug is now `baligirls`. Rename was intentionally deferred — don't "fix" it.
- **`pnpm-workspace.yaml` lists only `app/*`** — no `packages/` directory exists. Older README text mentioning `packages/*` is stale.
- **Maintenance gate is file-based**: `touch /var/www/baligirls/maintenance/.on` → nginx returns 503 to everyone except the bypass IP list (currently `194.5.82.35` and `127.0.0.1`). No reload needed. See [README.md](README.md) "Maintenance Mode".

## Reference docs in this repo

- [README.md](README.md) — full product, infra, endpoints, and migration history (canonical)
- [references/whatsapp-auth-lessons.md](references/whatsapp-auth-lessons.md) — **authoritative** auth/Twilio/WhatsApp reference (read first)
- [twilio_auth_guide.md](twilio_auth_guide.md) — WhatsApp 2FA setup (**partially superseded** by the lessons doc above)
- [references/features/](references/features/) — Inventory, architecture, creator info, access info (test creds), TnC, features_api, report
- [creator_engine/cleanup.md](creator_engine/cleanup.md) — full 12-step per-batch creator-data ETL pipeline (cross-batch dedup → import → consolidation)

## Where things are right now (snapshot — verify before relying)

- **Active creators in DB**: ~230 (was 231 before Wulan was deleted on 2026-05-16). The admin panel loads up to 500 in one shot via `/admin/accounts?limit=500`.
- **`provider_images` row count**: ~976. The on-disk avatar placeholder is `gs://gda-ce01-bucket/baligirls/uploads/avatar-default-lady.png`; 30+ creators have it as their sole image (use `WHERE image_file = 'avatar-default-lady.png'`).
- **NSFW audit set-up exists**: `audit_engine/` has the report files (`audit_report.{md,tsv}`, `flagged.json`, `all_detections.json`) + `image_manifest.tsv`. Re-running needs an `audit_engine/.venv` with `nudenet onnxruntime pillow` (was deleted post-run; recreate with `python3 -m venv .venv && .venv/bin/pip install ...`).
- **Stale legacy refs in docs are gone**: All `app/web/...` Next.js paths were swept to their `app/web-vite/...` equivalents on 2026-05-16. If you see one, it's new.
- **Login OTP (2026-06-20, LIVE)**: user/creator login is passwordless → the app generates a 6-digit code and **Charles** (OpenClaw `chs` on gda-ai01, WhatsApp +62 817-6917-122) delivers it via the `bg-otp-relay`; the user keys it back. `OPENCLAW_OTP_ENABLED=true`, `otpMethod:"whatsapp-code"`. See **Authentication** above. Older click-to-WhatsApp (Twilio inbound `whatsapp:+17407628065`) + Twilio Verify SMS remain coded fallbacks. Verified end-to-end (user + creator) on the live site.

For change history use `git log` in this tree — it is the live `main` checkout of `ascortbali_live.git`.
