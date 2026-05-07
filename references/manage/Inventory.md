# Inventory

Current-state inventory for the deployed `Baligirls` repo.

## Workspace Layout

```text
app/
  api/        Express API, auth, admin, analytics, creators, profile routes (port 8001)
  web-vite/   Vite SSR + React Router frontend (active production app, port 8002)
  web/        Legacy Next.js App Router frontend (deprecated, not in production)
  data/       Source JSON used by legacy build/import flows
database/
  migrate.py  Legacy Python migration helper
  seed.py     Legacy Python seed helper
engine/
  build_data.py
  remove_watermark.py
  page_scrapper/
  site_scrapper/
  watermark/
packages/
  types/      Shared TypeScript types package
references/
  features/   Current technical reference docs
  manage/     Operational notes and maintenance docs
```

## Frontend Surface

Pages currently present under `app/web/app`:

- `/`
- `/admin`
- `/admin/logged`
- `/creator`
- `/creator/logged`
- `/creator/register`
- `/creator/preview/[id]`
- `/user`
- `/user/logged`
- `/user/register`
- `/services`
- `/services/[id]`
- `/terms`
- `/privacy`

Frontend API/media routes currently present:

- `/api/admin-asset/[filename]`
- `/api/clean-image/[filename]`
- `/api/static/[...path]`
- `/api/upload`
- `/api/uploads/[...path]`

Key shared components:

- `AdvertisingSpaces.tsx`
- `AgeGateModal.tsx`
- `AnalyticsBeacon.tsx`
- `AuthNavButton.tsx`
- `BuyButton.tsx`
- `CreatorFilterControls.tsx`
- `FavoriteButton.tsx`
- `FooterStatus.tsx`

## Backend Surface

Top-level API routers mounted in `app/api/src/router.ts`:

- `/auth`
- `/services`
- `/me`
- `/orders`
- `/analytics`
- `/ads`
- `/creators`
- `/admin`

Data access pattern:

- `auth`, `admin`, `analytics`, `creators`, and `me` are primarily SQL/`pg` driven.
- `services` and `orders` currently use Prisma.
- This means the backend is hybrid, not a pure Prisma app.

## Runtime / Deploy

- App base path: `/baligirls`
- Frontend: Next.js 14
- API: Express 4
- Database: PostgreSQL
- Storage: Google Cloud Storage
- Process manager: PM2
- Reverse proxy: NGINX on the VM

## Notes

- `references/features` is intended to document the current implemented system.
- `references/manage` is intended for operational procedures and working notes.
- The legacy Python scripts and source JSON still exist, but the deployed app runtime is the TypeScript web/api workspace.
