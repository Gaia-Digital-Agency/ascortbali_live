# Baligirls

- README.md creation date: February 24, 2026
- Last updated: April 29, 2026 (production on `gda-ce01`; legacy `app/web` removed; SSR claim corrected to SPA)
- GitHub remote name: `origin`
- GitHub remote URL: `git@github.com:Gaia-Digital-Agency/ascortbali_staging.git` (repo name retains the legacy `ascortbali_staging` slug; this checkout is now the production tree)
- Developed by Gaida.com
- Copyright (C) 2026

## Overview

Baligirls is a multi-role web application served from the domain root in production. It is an online marketplace connecting creators (service providers) with users, featuring admin CMS management, image uploads, and WhatsApp-based two-factor authentication.

Primary stack:

- **React + Vite SPA** in `app/web-vite` (production frontend on port 8002)
  - Vite builds a static SPA into `dist/client/`. The Express server in `server.ts` serves the build via `express.static` + an `index.html` SPA fallback. **No SSR is performed** — the React tree is hydrated entirely in the browser.
  - The same Express server also handles GCS-backed image routes (`/api/upload`, `/api/uploads`, `/api/admin-asset`, `/api/clean-image`, `/api/static`) and `/sitemap.xml`.
- Express API in `app/api` (port 8001) — uses Prisma client (raw `$queryRawUnsafe` for the legacy `providers/app_accounts/…` tables; typed Prisma for newer tables like `Service`)
- PostgreSQL 18.3 (PG16 rollback cluster preserved on port 5433)
- Google Cloud Storage for media — authenticated via the VM's default service account (ADC, no key file)
- Twilio for WhatsApp 2FA
- nginx serves `/assets/*` (Vite-hashed, immutable, 1-year cache) directly from `dist/client/assets/` and proxies the rest to the Node processes
- PM2 + nginx on the production VM (`gda-ce01`)
- pnpm monorepo (single workspace glob: `app/*`)

> **Note:** A legacy Next.js 14 implementation lived in `app/web` (deleted on 2026-04-29). The frontend migrated to Vite SPA on 2026-04-15. Use `app/web-vite` for all new frontend work.

## Architecture

```
┌──────────────────────── baligirls.gaiada1.online (NGINX) ───────────────────────┐
│                                                                                  │
│  /api/upload, /api/uploads, /api/admin-asset, /api/clean-image                   │
│           →  127.0.0.1:8002   baligirls-web-vite (handles GCS upload/serving)    │
│  /api/*   →  127.0.0.1:8001   baligirls-api      (Express + Prisma)              │
│  /*       →  127.0.0.1:8002   baligirls-web-vite (Vite SSR + Express)            │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                  PostgreSQL 18.3 (localhost:5432, db: ascortbali)
                  PG16 rollback cluster on localhost:5433 (idle)
                                      │
                                      ▼
                    Google Cloud Storage (gda-ce01-bucket)
                    auth: VM default service account (ADC, cloud-platform scope)
```

### Monorepo layout

```
app/
├── web-vite/              ← production frontend (Vite SPA + React + React Router)
│   ├── index.html         ← HTML template with favicon links
│   ├── server.ts          ← Express server (port 8002): static SPA + GCS image routes + sitemap
│   └── src/
│       ├── pages/         ← route components (HomePage, AdminLoggedPage, etc.)
│       ├── components/    ← shared components (Layout, AuthNavButton, etc.)
│       └── lib/           ← api client, paths, utilities
└── api/                   ← Express API (port 8001)
    └── src/
        ├── routes/        ← auth, admin, creators, ads, me, services, analytics
        ├── lib/           ← pg, jwt, twilio, otp, env
        └── middleware/    ← auth, rateLimit
```

## App Compiling Steps
```bash
pnpm install
pnpm -r build
```

## App Run Steps
Local:
```bash
# API (port 8001)
pnpm --filter @ascortbali/api dev

# Web (Vite dev server)
cd app/web-vite && pnpm dev
```

Production:
- Web: `https://baligirls.gaiada1.online`
- API: `https://baligirls.gaiada1.online/api`

Server (PM2-managed):
```bash
# Production processes
pm2 restart baligirls-api baligirls-web-vite --update-env
pm2 save
```

## URL Structure

| URL | Description |
|-----|-------------|
| `https://baligirls.gaiada1.online` | Homepage — featured carousel, creator grid, ads |
| `https://baligirls.gaiada1.online/user` | User login |
| `https://baligirls.gaiada1.online/user/register` | User registration |
| `https://baligirls.gaiada1.online/user/logged` | User profile dashboard |
| `https://baligirls.gaiada1.online/creator` | Creator login |
| `https://baligirls.gaiada1.online/creator/register` | Creator registration |
| `https://baligirls.gaiada1.online/creator/logged` | Creator profile dashboard |
| `https://baligirls.gaiada1.online/creator/preview/:id` | Public creator profile page |
| `https://baligirls.gaiada1.online/admin` | Admin login |
| `https://baligirls.gaiada1.online/admin/logged` | Admin CMS dashboard |
| `https://baligirls.gaiada1.online/api` | API base path |

- Web traffic under `/` is routed by NGINX to `127.0.0.1:8002` (Vite SSR Express server)
- API traffic under `/api` is routed by NGINX to `127.0.0.1:8001` (Express API)

## Features

### Homepage
- **Featured Girls carousel**: 7 creator cards in a horizontally scrollable row (centered on load with ~1.5 cards peeking each side)
- **Your Ads Here row**: 3 ad cards in a grid below the featured girls
- **4 ad image slots** (home-1, home-2, home-3, home-4): managed by admin, home-4 is landscape (16:9) for the bottom banner
- **Editable tagline**: admin-configurable text shown in the navbar next to "FREE BALI GIRLS"
- **Creator grid**: 20 creators per page with pagination
- **Filter controls**: filter by nationality, age, height
- **Bottom section**: Ad 4 image (landscape) + bottom text ad card
- **Featured girls selection**: admin selects 7 active creators by name

### User Portal (`/user`)
- Registration with email, password, phone, WhatsApp, full name, gender, age group, nationality, city, preferred contact, relationship status
- Email used as login username (noted in UI)
- WhatsApp used for 2FA authentication (noted in UI)
- Phone and WhatsApp are compulsory fields
- Profile editing (all fields including email change with uniqueness check)
- Password change
- Error messages shown as red banner below page title

### Creator Portal (`/creator`)
- Registration with all fields compulsory except Telegram
- Separate phone and WhatsApp fields (can be different numbers)
- Services multi-select: Massage, Sex, Anal, BDSM, Role Play, Vanilla, Refer Notes
- Hair length dropdown: Very Short, Short, Medium, Shoulder, Long, Very Long
- Profile dashboard with full editing of all fields:
  - Ethnicity dropdown (Asian, West European, Eastern European, African, etc.)
  - Travel dropdown (Travel To Meet, Expense Paid, No Travelling, etc.)
  - Services as checkboxes in radio button area
  - Last Seen Online auto-populated on save
- 20 image slots (1 main + 19 others)
- Activate/Deactivate profile (discrete link at bottom-right)
  - Deactivate is soft — takes profile offline, does not delete
  - Creator can reactivate at any time
- Password change
- Error messages shown as red banner below page title

### Admin CMS (`/admin/logged`)
- **Homepage Image Ads (1-4)**: upload images, set click URLs, auto-save on upload, home-4 shown as landscape
- **Homepage Tagline**: editable text shown on homepage
- **Featured Girls Carousel**: select 4 active creators by name from dropdown
- **Bottom Card Text**: editable bottom ad text
- **Stats**: registered creators and users count
- **User management**: view all users, VIEW button opens popup with all fields
- **Creator management**: separated into Active and Inactive sections with status indicators
- **View/Edit/Delete popup**: 
  - CLOSE button (white, visible)
  - EDIT mode makes all fields editable
  - DELETE has inline confirmation ("Are you sure?")
  - Creator delete is soft delete (deactivates, moves to Inactive)
- Password change

### Authentication
- JWT-based auth with Ed25519 keys (access + refresh tokens)
- Login via email + password for all portals
- User and creator can change their login email
- Forgot password: verify identity with 2 matching fields, then reset
- Bcrypt password hashing (auto-upgrades legacy plaintext on login)

### WhatsApp 2FA (Optional)
- Production has it **enabled** (`WHATSAPP_2FA_ENABLED=true` in `app/api/.env`); disable by setting `false`
- When enabled, sends 6-digit OTP via WhatsApp (Twilio) after password validation
- OTP expires in 5 minutes, max 5 attempts
- Resend code and back-to-login options on verification screen
- Graceful fallback: if WhatsApp send fails, login proceeds normally
- Applies to all portals when account has a WhatsApp number
- Setup guide: `twilio_auth_guide.md`

API endpoints:
- `POST /auth/2fa/verify` — submit OTP code
- `POST /auth/2fa/resend` — resend OTP

Environment variables:
```
WHATSAPP_2FA_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Repo Notes

- Production host: `gda-ce01` (GCE, `asia-southeast1-b`) — external `34.158.47.112`, internal `10.148.0.4`
- Internal web port: `8002` (Vite SSR Express server, active)
- Internal API port: `8001`
- Legacy Next.js (`baligirls-web`, port `3001`) is not deployed on this server
- HTTPS: served via nginx at `https://baligirls.gaiada1.online` (config: `/etc/nginx/sites-enabled/gaiada1-subdomains`)
- TLS: shared `gaiada1.online` Let's Encrypt cert at `/etc/letsencrypt/live/gaiada1.online/`
- Co-tenants on this VM: `schoolcatering-api`, `schoolcatering-web` (separate apps, unrelated processes)
- Monorepo workspaces: `app/*`, `packages/*`
- Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`
- Some internal identifiers still use legacy `ascortbali` naming (package names in `app/api`, GitHub repo name, database name)

## PM2 Processes

| Process | Description | Port | Status |
|---|---|---|---|
| `baligirls-web-vite` | Vite SSR + Express server (production web) | 8002 | online |
| `baligirls-api` | Express API | 8001 | online |

## GCP Storage Uploads

- Upload storage uses Google Cloud Storage
- Bucket: `gda-ce01-bucket`
- Upload prefix: `baligirls/uploads`
- Ads upload path: `baligirls/ads`
- Auth: VM default service account with `cloud-platform` scope (Application Default Credentials). **No key file** is mounted in production — `GOOGLE_APPLICATION_CREDENTIALS` is intentionally unset; the staging-era `.secrets/gda-s01-storage-key.json` does not exist here.
- Runtime env (set in `app/web-vite/.env`):
  - `GCS_BUCKET_NAME=gda-ce01-bucket`
  - `GCS_UPLOAD_PREFIX=baligirls/uploads`
- Upload endpoint: `POST /api/upload` (proxied by nginx to web-vite, not the API)
- Uploaded file retrieval: `GET /api/uploads/<object-key>` (also served by web-vite)
- Other GCS-backed routes proxied to web-vite: `/api/admin-asset`, `/api/clean-image`

## Database

- PostgreSQL **18.3** on `localhost:5432`, database: `ascortbali`
- A PG **16** cluster is preserved on `localhost:5433` as a rollback target (not used by the app)
- Key tables:
  - `app_accounts` — user/admin accounts (id, role, username, password, phone, whatsapp)
  - `user_profiles` — user profile data (linked to app_accounts)
  - `providers` — creator accounts and full profile data
  - `provider_images` — creator image slots (20 per creator)
  - `advertising_spaces` — ad slots (home-1 through home-4, bottom)
  - `advertising_space_history` — ad change audit log
  - `site_settings` — key-value store (tagline, featured_girl_1-7)

## API Endpoints Summary

### Public
- `GET /ads` — ad spaces (home-1 through home-4 + bottom)
- `GET /ads/settings` — site settings (tagline, featured girls)
- `GET /creators` — paginated creator list
- `GET /creators/:id` — single creator detail

### Auth
- `POST /auth/login` — login (returns tokens or 2FA challenge)
- `POST /auth/register` — user registration
- `POST /auth/register/creator` — creator registration
- `POST /auth/2fa/verify` — OTP verification
- `POST /auth/2fa/resend` — resend OTP
- `POST /auth/refresh` — refresh access token
- `POST /auth/change-password` — change password (authed)
- `POST /auth/forgot-password/verify` — identity verification
- `POST /auth/forgot-password/reset` — password reset

### User (authed)
- `GET /me` — current user info
- `GET /me/user-profile` — full user profile
- `PUT /me/user-profile` — update profile (including email, phone, WhatsApp)

### Creator (authed)
- `GET /me/creator-profile` — full creator profile
- `PUT /me/creator-profile` — update profile
- `GET /me/creator-images` — image list
- `POST /me/creator-images` — upload/set image
- `DELETE /me/creator-images/:id` — remove image

### Admin (authed, admin role)
- `GET /admin/stats` — creator/user counts
- `GET /admin/accounts` — paginated user/creator lists
- `GET /admin/accounts/users/:id` — full user detail
- `GET /admin/accounts/creators/:id` — full creator detail
- `PUT /admin/accounts/users/:id` — update any user field
- `PUT /admin/accounts/creators/:id` — update any creator field
- `DELETE /admin/accounts/users/:id` — delete user
- `DELETE /admin/accounts/creators/:id` — delete creator
- `GET /admin/ads` — all ad slots
- `POST /admin/ads` — create/upsert ad
- `PUT /admin/ads/:slot` — update ad slot
- `DELETE /admin/ads/:slot` — clear ad slot
- `GET /admin/settings` — all site settings
- `PUT /admin/settings/:key` — update a setting
- `GET /admin/creator-names` — active creator names (for featured girls selector)

## Reference Documents

- `twilio_auth_guide.md` — WhatsApp 2FA setup and troubleshooting
- `references/features/Inventory.md`
- `references/features/architecture.md`
- `references/features/creator_info.md` — creator reference table
- `references/features/access_info.md` — test credentials
- `references/features/TnC.md` — Terms and Conditions
- `references/features/features_api.md` — feature summary
- `references/features/report.md` — technical review

## Media / Data Notes

- GCS-backed media routes (served by web-vite, port 8002, proxied by nginx):
  - `GET /api/clean-image/<filename>` — on-the-fly resize/format conversion (sharp), in-memory LRU cache for transformed variants
  - `GET /api/uploads/<object-key>` — direct stream pass-through, immutable 1-year cache (object keys are timestamp-based)
  - `GET /api/admin-asset/<filename>`, `GET /api/static/<path>`

---

## Production Health Audit (2026-05-04)

### Service Status — ✅ All Healthy

| Endpoint | Status |
|----------|--------|
| `https://baligirls.gaiada1.online/` | 200 |
| `https://baligirls.gaiada1.online/api/ads` | 200 |
| `https://baligirls.gaiada1.online/api/creators?page=1&limit=5` | 200 |

### PM2 Process Manager — Running

PM2 is managed via systemd unit `pm2-azlan.service` (User=`azlan`, `PM2_HOME=/home/azlan/.pm2`). Resurrect file: `/home/azlan/.pm2/dump.pm2`.

Live PM2 list (this VM):

| ID | Name | Mode | Instances | PID | Restarts | Status |
|----|------|------|-----------|-----|----------|--------|
| 0 | schoolcatering-web | fork | 1 | 1232 | 0 | online |
| 1 | schoolcatering-api | fork | 1 | 1238 | 0 | online |
| 2 | baligirls-web-vite | fork | 1 | 61997 | 7 | online |
| 3 | baligirls-api | cluster | (worker 1) | 1244 | 0 | online |
| 4 | baligirls-api | cluster | (worker 2) | 1254 | 0 | online |

Notes:
- `baligirls-api` runs in **cluster mode with 2 workers** (PIDs 1244, 1254) for horizontal CPU usage / zero-downtime reload
- `baligirls-web-vite` runs in **fork mode** (single process), launched via `tsx --env-file=.env server.ts` (CWD: `app/web-vite`)
- Process owner is **`azlan`** (not `www-data`) — file ownership in `/var/www/baligirls/` is therefore `azlan:www-data`
- No `ecosystem.config.js` at the repo root; PM2 is configured via the in-memory dump (`pm2 save`). To rebuild config-as-code, generate one from current state with `pm2 ecosystem` and check it in.
- No cron jobs configured for the app (no scheduled cleanup, no log rotation by app — relies on PM2 internal logs)

### Production Domain — Not Yet Mapped

- The app is currently only reachable at `https://baligirls.gaiada1.online` (subdomain on shared `gaiada1.online` Let's Encrypt cert).
- A real production domain has **not** been provisioned on this VM. Specifically:
  - `baligirls.com` resolves to `13.223.25.84` (AWS — unrelated third-party site, not us)
  - `baligirls.id`, `baligirls.co.id`, `baligirlsbali.com` — all NXDOMAIN
- No nginx server block exists for any production hostname; only the `baligirls.gaiada1.online` block in `/etc/nginx/sites-enabled/gaiada1-subdomains` is live.
- When a production domain is chosen and registered, the cutover will require: (a) DNS A record → `34.158.47.112`, (b) dedicated Let's Encrypt cert (DNS-01 or HTTP-01), (c) new nginx server block in a sites-available file (mirroring the `baligirls.gaiada1.online` block but referencing the new cert), (d) reload.

### Disk & Database Footprint

| Path | Size |
|------|------|
| `/var/www/baligirls/` (total) | 1.2 GB |
| `node_modules/` (root pnpm store) | 738 MB |
| `engine/` (Python scrapers + watermark) | 264 MB |
| `references/` (assets + docs) | 8.4 MB |
| `app/` (api + web-vite source) | 2.1 MB |
| PostgreSQL `ascortbali` DB | 9.4 MB |

The bulk of disk use is `node_modules` (expected for a pnpm monorepo). The `engine/` Python toolkit is dev-only and not invoked at runtime — candidate to move out of the production tree if disk pressure ever becomes an issue.

### `engine/` — Python Tooling

Not part of the runtime. Used for one-off data ops:

- `build_data.py` — bulk profile data assembly
- `scrape_full_image.py` — image fetcher
- `remove_watermark.py` — watermark removal pipeline
- `page_scrapper/`, `site_scrapper/` — source-site scrapers
- `watermark/` — watermark assets
- `.venv_watermark/` — local Python venv (excluded from runtime)

Requirements: `engine/requirements_remove_watermark.txt`.

### Known Discrepancies / Observations

1. **README earlier states "PM2 + nginx"** (line ~24) — confirmed accurate. Both processes are PM2-managed, not raw `node`/`tsx` despite the bare `node`/`tsx` strings visible in `ps aux`. PM2 spawns these directly (cluster fork for the API, single fork for web-vite via bash → tsx).
2. **README claims production frontend on port 8002** — confirmed (Vite SPA + Express).
3. **README mentions both `app/*` and `packages/*` workspaces** — only `app/*` exists in `pnpm-workspace.yaml`; no `packages/` directory. README line referencing both should be reconciled.
4. **GitHub repo slug is `ascortbali_staging`** — but this checkout is the production tree. Internal package names also still use `ascortbali` (`@ascortbali/api`). Rename is intentionally deferred.
5. **`app/api/node_modules` and `app/web-vite/node_modules` are tiny** (124K, 132K) — pnpm hoists deps to root. Don't mistake their small size for a broken install.

### Recovery / Restart Quick Reference

```bash
# Restart everything
sudo -u azlan pm2 restart baligirls-api baligirls-web-vite --update-env
sudo -u azlan pm2 save

# Reload nginx after config change
sudo nginx -t && sudo nginx -s reload

# View live logs
sudo -u azlan pm2 logs baligirls-api --lines 100
sudo -u azlan pm2 logs baligirls-web-vite --lines 100

# Database connect
sudo -u postgres psql ascortbali
```
