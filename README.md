# Baligirls

- README.md creation date: February 24, 2026
- Last updated: May 7, 2026 (migrated from `gda-ce01` to `gda-pn01`; live at `baligirls.gaiada2.online`; new repo `ascortbali_live`)
- GitHub remote name: `origin`
- GitHub remote URL: `git@github.com:Gaia-Digital-Agency/ascortbali_live.git` (this is the production tree; the older `ascortbali_staging` repo is no longer the source of truth)
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
- Google Cloud Storage for media — authenticated via a service-account JSON key (`/etc/gda-credentials/gda-viceroy-17373de6d690.json`, mode 600). The VM's default compute service account is read-only-scoped, so a key file with `storage.objectAdmin` on the bucket is required for uploads/deletes.
- Twilio for WhatsApp 2FA — **currently disabled** in production (`WHATSAPP_2FA_ENABLED=false`)
- nginx serves `/assets/*` (Vite-hashed, immutable, 1-year cache) directly from `dist/client/assets/` and proxies the rest to the Node processes
- PM2 + nginx on the production VM (`gda-pn01`)
- pnpm monorepo (single workspace glob: `app/*`)

> **Note:** A legacy Next.js 14 implementation lived in `app/web` (deleted on 2026-04-29). The frontend migrated to Vite SPA on 2026-04-15. Use `app/web-vite` for all new frontend work.

## Recent Changes (May 2026 migration)

The app moved from `gda-ce01` (`baligirls.gaiada1.online`) to `gda-pn01` (`baligirls.gaiada2.online`) on 2026-05-06/07. Notable changes captured in the cutover:

**Infrastructure**
- New host: `gda-pn01` (GCE, external `34.2.143.47`, internal `10.148.0.9`).
- Dedicated nginx vhost at `/etc/nginx/sites-enabled/baligirls` with its own Let's Encrypt cert.
- GCS auth switched from default-compute-SA (read-only) to a service-account JSON key (`/etc/gda-credentials/gda-viceroy-17373de6d690.json`) — uploads + deletes now work end-to-end.
- 2FA env-parser bug fixed: `WHATSAPP_2FA_ENABLED=false` was being silently flipped to `true` by `z.coerce.boolean()`. Replaced with an explicit string-match parser; 2FA is now off in production.
- Sitemap, robots.txt, and `index.html` (`og:url`, `canonical`) now point to `baligirls.gaiada2.online` (`PUBLIC_SITE_URL` overrideable via env).

**UX / product**
- New brand logo + multi-size favicon (256×256 source, retina-clean at 56 px header display).
- Two stacked side ads per side (left = `home-1` + `home-2`, right = `home-3` + `home-4`) on every page that has side ads.
- Top pagination removed from the homepage; bottom pagination retained.
- Site-wide button hover states reworked (no more clipping inside `overflow-hidden` containers); custom gold chevron + 2.75 rem right padding on every `<select>`.
- Creator card NAME strip is now a fixed-height (44 px) row that always vertically centers correctly.

**Creator / public profile**
- New field: **WeChat ID** (added via creator registration → profile → public view; stored in `providers.wechat_id`).
- Public profile DETAILS now split into two zones with a visible separator:
  - **Profile info** — visible to everyone (guests included).
  - **Contact** — last four rows (Phone/SMS, Whatsapp, Telegram, WeChat ID), always rendered (em-dash if empty), blurred for guests with a MEMBERS ONLY overlay.
- Image gallery + feature image are now visible to guests (only contacts gated).

**Creator profile management page**
- `NOTES` field renamed to `ABOUT ME` (DB column unchanged).
- `CITY` text input replaced by a multi-area **SERVICE AREA** checklist popover (All Bali / Ubud / Seminyak / Canggu / Nusa Dua / Sanur / Kuta / Denpasar / Jimbaran / Uluwatu / Legian / Tabanan / Pererenan / Bukit / Gianyar). Stored comma-separated in the existing `providers.city` column (max bumped from 50 → 500 chars).
- `COUNTRY` field removed from the editor (DB column kept; API now treats it as optional).
- Gender choices restricted to **Female / Transgender** (matches registration). Existing rows with other values aren't broken.

**Creator registration page**
- Gender choices: **Female / Transgender** only (Male and Undisclosed removed).
- `HAIR LENGTH` and `SERVICES` fields removed entirely — those live in the profile editor only.
- Contact fields: Phone/SMS (required) + Whatsapp (required, used for 2FA when enabled) + Telegram (optional) + WeChat ID (optional).

**Repo / source control**
- Source canonical repo is now `git@github.com:Gaia-Digital-Agency/ascortbali_live.git` — first commit landed on `main` on 2026-05-07.
- Production checkout on `gda-pn01` lives at `/var/www/baligirls/` (deployment target). The clone for git operations lives at `/home/azlan/repos/ascortbali_live/`.

## Architecture

```
┌──────────────────────── baligirls.gaiada2.online (NGINX) ───────────────────────┐
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
                    Google Cloud Storage (gda-ce01-bucket — name kept post-migration)
                    auth: service-account JSON key
                          /etc/gda-credentials/gda-viceroy-17373de6d690.json
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
- Web: `https://baligirls.gaiada2.online`
- API: `https://baligirls.gaiada2.online/api`

Server (PM2-managed):
```bash
# Production processes
pm2 restart baligirls-api baligirls-web-vite --update-env
pm2 save
```

## URL Structure

| URL | Description |
|-----|-------------|
| `https://baligirls.gaiada2.online` | Homepage — featured carousel, creator grid, ads |
| `https://baligirls.gaiada2.online/user` | User login |
| `https://baligirls.gaiada2.online/user/register` | User registration |
| `https://baligirls.gaiada2.online/user/logged` | User profile dashboard |
| `https://baligirls.gaiada2.online/creator` | Creator login |
| `https://baligirls.gaiada2.online/creator/register` | Creator registration |
| `https://baligirls.gaiada2.online/creator/logged` | Creator profile dashboard |
| `https://baligirls.gaiada2.online/creator/preview/:id` | Public creator profile page |
| `https://baligirls.gaiada2.online/admin` | Admin login |
| `https://baligirls.gaiada2.online/admin/logged` | Admin CMS dashboard |
| `https://baligirls.gaiada2.online/api` | API base path |

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
- Production currently has it **disabled** (`WHATSAPP_2FA_ENABLED=false` in `app/api/.env`).
- When enabled, sends 6-digit OTP via WhatsApp (Twilio) after password validation, OTP expires in 5 minutes, max 5 attempts.
- Resend code and back-to-login options on verification screen. Graceful fallback: if WhatsApp send fails, login proceeds normally.
- Applies to all portals when account has a WhatsApp number.
- Setup guide: `twilio_auth_guide.md`.
- **Important**: the env parser in `app/api/src/lib/env.ts` parses this as an explicit string match (`"true"` / `"1"` / `"yes"` / `"on"`). Earlier `z.coerce.boolean()` was treating `"false"` as `true` (because `Boolean("false") === true`); that bug was fixed on 2026-05-07. To re-enable 2FA, set `WHATSAPP_2FA_ENABLED=true` and `pm2 restart baligirls-api`.

API endpoints:
- `POST /auth/2fa/verify` — submit OTP code
- `POST /auth/2fa/resend` — resend OTP

Environment variables (in `app/api/.env`):
```
WHATSAPP_2FA_ENABLED=false   # set to "true" to re-enable
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Repo Notes

- Production host: `gda-pn01` (GCE) — external `34.2.143.47`, internal `10.148.0.9`
- Internal web port: `8002` (Vite SPA + Express server, active)
- Internal API port: `8001`
- Legacy Next.js (`baligirls-web`, port `3001`) is not deployed on this server
- HTTPS: served via nginx at `https://baligirls.gaiada2.online` (config: `/etc/nginx/sites-enabled/baligirls`, dedicated per-host file)
- TLS: dedicated Let's Encrypt cert at `/etc/letsencrypt/live/baligirls.gaiada2.online/` (Certbot-managed, auto-renew via systemd timer)
- Co-tenants on this VM: `essentialbali`, `essentialbali-cms`, `essentialbali-daily-feed`, `schoolcatering-api`, `schoolcatering-web` (separate apps, unrelated processes)
- Monorepo workspaces: `app/*` (single glob in `pnpm-workspace.yaml`)
- Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`
- Some internal identifiers still use legacy `ascortbali` naming (package names in `app/api` like `@ascortbali/api`, database name `ascortbali`). The GitHub repo slug is now `ascortbali_live`.

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
- Auth: **service-account JSON key** at `/etc/gda-credentials/gda-viceroy-17373de6d690.json` (mode 600, owned by `azlan`). The VM's default compute SA on `gda-pn01` only has `devstorage.read_only` scope, which fails uploads with `Provided scope(s) are not authorized`; the SA from the key file has `storage.objectAdmin` on the bucket and is what the Storage client uses. Set via `GOOGLE_APPLICATION_CREDENTIALS` in `app/web-vite/.env` (and add to `app/api/.env` if/when the API also needs to write to GCS, e.g. for delete-on-image-removal).
- Runtime env (set in `app/web-vite/.env`):
  - `GCS_BUCKET_NAME=gda-ce01-bucket` (bucket name retained from old VM — name is just an identifier, no need to rename post-migration)
  - `GCS_UPLOAD_PREFIX=baligirls/uploads`
  - `GOOGLE_APPLICATION_CREDENTIALS=/etc/gda-credentials/gda-viceroy-17373de6d690.json`
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

## Production Health Audit (2026-05-07)

### Service Status — ✅ All Healthy

| Endpoint | Status |
|----------|--------|
| `https://baligirls.gaiada2.online/` | 200 |
| `https://baligirls.gaiada2.online/api/ads` | 200 |
| `https://baligirls.gaiada2.online/api/creators?page=1&limit=5` | 200 |

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

### Production Domain — Subdomain Only (no apex domain provisioned)

- The app is reachable at `https://baligirls.gaiada2.online` only — a subdomain of `gaiada2.online`, served from a dedicated nginx server block (`/etc/nginx/sites-enabled/baligirls`) with its own Let's Encrypt cert at `/etc/letsencrypt/live/baligirls.gaiada2.online/`.
- A real production domain (e.g. `baligirls.com`) has **not** been provisioned. Specifically:
  - `baligirls.com` resolves to `13.223.25.84` (AWS — unrelated third-party site, not us)
  - `baligirls.id`, `baligirls.co.id`, `baligirlsbali.com` — all NXDOMAIN
- When a production domain is chosen and registered, the cutover will require: (a) DNS A record → `34.2.143.47`, (b) issue a Let's Encrypt cert (DNS-01 or HTTP-01) for the new hostname, (c) new nginx server block (mirror `/etc/nginx/sites-enabled/baligirls` with the new `server_name` and cert paths), (d) reload nginx, (e) update `PUBLIC_SITE_URL` in `app/web-vite/.env` and `og:url`/`canonical` in `app/web-vite/index.html` if the new domain becomes canonical.

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
4. **GitHub repo slug is `ascortbali_live`** as of the May 2026 migration. Internal package names still use the legacy `ascortbali` prefix (`@ascortbali/api`); rename is intentionally deferred to keep imports stable.
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
