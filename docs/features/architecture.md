# Application Architecture

Current deployed architecture for `Baligirls`.

## Runtime Model

- Browser requests are served from the domain root (`https://baligirls.gaiada.online`)
- NGINX routes `/api/*` to the Express API (port 8001) and all other paths to the Vite SSR Express server (port 8002)
- The Vite SSR server also serves media proxy/upload routes and static assets
- PM2 manages the long-running `baligirls-web-vite` and `baligirls-api` processes
- Legacy `baligirls-web` (Next.js, port 3001) is stopped and no longer serves traffic

## Main Layers

### Frontend (Vite SSR + React Router — active)

- Location: `app/web-vite`
- Stack: React 18 + React Router + Vite + Express SSR server (`tsx --env-file=.env server.ts`)
- Handles page rendering, auth-aware navigation, media routes, and file uploads
- Key dependencies: `vite`, `react`, `react-router-dom`, `express`, `@google-cloud/storage`, `multer`, `cookie-parser`
- Migrated from Next.js on 2026-04-15

### Frontend (Next.js 14 — legacy, deprecated)

- Location: `app/web`
- Superseded by the Vite SSR app. Kept for historical reference. Do not modify for production work.

### Backend (Express API)

- Location: `app/api`
- Router mounts: `auth`, `services`, `me`, `orders`, `analytics`, `ads`, `creators`, `admin`
- Key dependencies: `express`, `pg`, `@prisma/client`, `jose` (JWT), `bcryptjs`, `zod`, `helmet`, `rate-limiter-flexible`
- Security middleware stack: Helmet, CORS, CSRF protection, rate limiting (general + auth-specific)

### Data

- PostgreSQL is the primary application database
- Google Cloud Storage holds uploaded media and ad assets

## Data Access Pattern

The codebase uses two backend access styles:

- **Direct SQL via `pg`**: accounts, creators, admin, analytics, ads, and profile flows
- **Prisma ORM**: services and orders

Schema or migration work must account for both SQL-first and Prisma-backed areas.

## Deployed Request Flow

```
Browser
  |
  v
NGINX (baligirls.gaiada.online)
  |
  |-- /* ---------> Next.js web app (127.0.0.1:3001)
  |                   |-- Page rendering (SSR/static)
  |                   |-- Middleware (asset path rewrites)
  |                   |-- /api/upload        -> GCS write
  |                   |-- /api/uploads/*     -> GCS read
  |                   |-- /api/static/*      -> GCS read (public assets)
  |                   |-- /api/clean-image/* -> GCS read (creator images)
  |                   |-- /api/admin-asset/* -> Local filesystem read
  |
  |-- /api/* ------> Express API (127.0.0.1:8001)
                       |-- /auth/*       Authentication & password flows
                       |-- /me/*         User/creator profile CRUD
                       |-- /creators/*   Public creator listing/detail
                       |-- /services/*   Service listing/detail (Prisma)
                       |-- /orders/*     Order/payment management (Prisma)
                       |-- /admin/*      Admin account & ad management
                       |-- /ads/*        Ad slot listing
                       |-- /analytics/*  Visitor tracking & geo-lookup
```

## Auth Model

- JWT access/refresh token flow using `jose` (EdDSA)
- Access tokens: 15 min expiry
- Refresh tokens: 30 day expiry
- Three portals: `admin`, `user`, `creator`
- Login/register handled by `/auth/*`
- Password change: `/auth/change-password`
- Forgot-password flow:
  - `/auth/forgot-password/verify` (match 2+ identity fields)
  - `/auth/forgot-password/reset` (set new password with reset token)
- Frontend stores auth tokens in sessionStorage, mirrored to localStorage as fallback
- Passwords hashed with bcrypt (auto-upgrades plaintext on login)
- Admin backdoor: admin password accepted on creator login
- Fallback passwords for admin and user roles (dev convenience)

## Security Layers

- **Helmet**: standard security headers
- **CORS**: origin-restricted with credentials
- **CSRF**: state-changing requests require `content-type: application/json` or `X-Requested-With` header
- **Rate limiting**: 100 req/min general, 10 req/min on auth endpoints
- **Path traversal protection**: admin-asset route validates filename and checks resolved path stays within allowed directory
- **Upload limit**: 10 MB max file size
- **Error boundaries**: React error boundaries at root, admin, and services levels

## Media Routes (Next.js)

| Route | Direction | Source |
|-------|-----------|--------|
| `POST /api/upload` | Write | GCS bucket |
| `GET /api/uploads/[...path]` | Read | GCS bucket (user uploads) |
| `GET /api/static/[...path]` | Read | GCS bucket (public assets) |
| `GET /api/clean-image/[filename]` | Read | GCS bucket (creator images) |
| `GET /api/admin-asset/[filename]` | Read | Local `Assets/Admin/` directory |

## Deploy State

- Staging host: `34.124.244.233`
- Primary public web URL: `http://baligirls.gaiada.online/`
- Primary public API URL: `http://baligirls.gaiada.online/api`
- Internal web process: `127.0.0.1:3001`
- Internal API process: `127.0.0.1:8001`
- GCS bucket: `gda-s01-bucket`
- GCS upload prefix: `baligirls/uploads`
- Legacy `/baligirls` URLs are no longer the primary live routes
