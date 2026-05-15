# Custom System Architecture Case | Baligirls

## Overview

- **File created:** 2026-02-10
- **GitHub remote:** `origin` (`git@github.com-net1io:Gaia-Digital-Agency/ascortbali_staging.git`)
- **App title:** Baligirls
- **App introduction:** A premium service marketplace platform connecting **Registered Users** with **Creator Users**, featuring a dark + gold themed UI, JWT authentication across 3 portals, a Python engine pipeline for scraped content + image processing, and deployment on GCP (Compute Engine + NGINX + PM2 + Cloud SQL + GCS).

## App Architecture

### Architecture Summary

Baligirls is a **custom-built (non-CMS) marketplace application** with:

- A **Next.js 14 (App Router)** web frontend (`app/web`)
- An **Express 4** backend API (`app/api`) exposing REST endpoints
- A **PostgreSQL** database layer (Cloud SQL in deployment docs)
- A separate **Python engine pipeline** (`cleanup_engine/`) that generates database-ready JSON from scraped content and processes images (OCR + inpainting), feeding the DB seeding flow
- GCP infrastructure documented for **Compute Engine**, **NGINX** path-based routing, **PM2** process management, **Secret Manager**, and **GCS** for static assets/uploads

### High-Level Deployment / Runtime Topology (As Documented)

```
                 (Public)
                   |
            +-------------+
            |   NGINX     |  (Compute Engine VM)
            |   :80       |
            +------+------+ 
                   |
     +-------------+------------------------------+
     |                                            |
     | /baligirls/*                               | /baligirls/api/*
     v                                            v
+---------------------+                 +------------------------+
| Next.js Web         |                 | Express API            |
| PM2: baligirls-web  |                 | PM2: baligirls-api     |
| loopback :3001      |                 | loopback :8001         |
+----------+----------+                 +-----------+------------+
           |                                        |
           |                                        v
           |                               +---------------------+
           |                               | Cloud SQL (Postgres)|
           |                               +---------------------+
           |
           v
+---------------------+
| GCS (static/uploads)|
| bucket: gda-s01...  |
+---------------------+
```

### Data Flow (App + Engine)

```
Engine (Python): scrape -> watermark removal -> build JSON
  -> app/data/page_data.json + app/data/image_data.json
  -> DB seed (database_engine/seed.py or Prisma seed)
  -> Express API reads DB -> Next.js renders UI
```

## App Language and Frameworks

- **Frontend:** Next.js 14, React 18, Tailwind CSS, TypeScript
- **Backend:** Node.js (ESM), Express 4, TypeScript, Zod (validation), JOSE (JWT EdDSA/Ed25519), Helmet/CORS/Morgan, rate limiting
- **Database:** PostgreSQL
- **ORM/DB toolchain (present):** Prisma (`app/api/prisma/schema.prisma`, `@prisma/client`)
- **Engine:** Python 3 scripts (Selenium scraping, EasyOCR, LaMa inpainting)
- **Monorepo:** pnpm workspaces (`app/*`, `packages/*`)

## App File Structure (Repo Reality)

```
AscortBali/
├── app/
│   ├── web/                  # Next.js (frontend)
│   └── api/                  # Express API + Prisma
├── database_engine/                 # SQL schema + Python migrate/seed (psycopg2)
├── cleanup_engine/                   # Python scraping + watermark removal + JSON generation
├── packages/                 # Shared workspace packages (types/config)
├── references/               # Deployment + ops docs
└── comparison/               # System comparisons (this document lives here)
```

Notes:

- There are **two DB schema/seed paths present**:
  - `database_engine/schema.sql` + `database_engine/migrate.py` + `database_engine/seed.py` (direct Postgres via `psycopg2`)
  - `app/api/prisma/schema.prisma` + Prisma migrations + `app/api/prisma/seed.ts`

## App Compiling Steps (Build)

From repo root:

```bash
pnpm install
pnpm -r build
```

Package-specific:

```bash
pnpm --filter @ascortbali/web build
pnpm --filter @ascortbali/api build
```

## App Run Steps 

Prereqs (as documented): Node.js 20 LTS, PostgreSQL 16, pnpm, Python 3.x for scripts.

```bash
# database (one documented path)
export DATABASE_URL=postgresql://ascort:ascort@localhost:5432/ascortbali
python3 database_engine/migrate.py
python3 database_engine/seed.py

# start all services
pnpm dev
```

## Suggested Testing

- **Static checks**
  - `pnpm lint`
  - `pnpm typecheck`
- **Build**
  - `pnpm -r build`
- **API smoke**
  - `curl http://127.0.0.1:4000/health`
  - Exercise one protected endpoint after login (JWT + refresh flow)
- **DB**
  - Re-run migrate/seed against a fresh local database and validate core tables/views exist (for the `database_engine/` SQL path)
  - If using Prisma: run `pnpm --filter @ascortbali/api db:migrate` and `pnpm --filter @ascortbali/api db:seed`

## System Architecture

Based on the codebase and deployment docs, Baligirls is best described as:

- **Layered architecture (present):**
  - UI layer (Next.js pages/components)
  - API layer (Express routes + middleware)
  - Data access layer (Prisma client + Postgres; plus legacy direct SQL seed/migration scripts)
- **Monolithic (present, with modular separation):**
  - Deployed as two tightly-coupled services (web + api) on the same VM and routed by NGINX under a shared base path (`/baligirls`).
- **Batch/offline pipeline component (present):**
  - Python engine produces data and images that are later injected into the DB and/or deployed to GCS.

Architectures not evidenced by this repo (and therefore not claimed here): CQRS, pub/sub, microservices, micro-kernel.

## System Behaviour Potentials

- **Functionality:** Strong baseline marketplace scaffold: multi-portal auth, profiles, creator listings, ads, analytics beacon, image upload/static serving.
- **Maintainability:** Reasonable (TypeScript + workspace layout + schema validation), but watch the **dual DB schema paths** (SQL+Python vs Prisma) which can create drift.
- **Scalability:** Vertical scaling is straightforward on a single VM; the web/api split allows independent scaling, but current docs reflect a single-host deployment.
- **Reliability:** Improved by PM2 process supervision + health endpoint; production reliability depends on NGINX + DB uptime + correct secret management.
- **Efficiency:** Next.js SSR/streaming potential is available; API is simple and should be fast for current endpoints; image serving via GCS helps offload static traffic.
- **Consistency:** Postgres is the source of truth for app state; engine-generated JSON and two schema paths can introduce inconsistency if not governed.
- **Availability:** Single-VM deployment is a single point of failure unless replicated; availability is bounded by that topology.

## Frontend Feature Elements 

- **UI/UX:** Dark + gold theme, custom Tailwind tokens, explicit branding and navigation elements.
- **Mobile-view friendly:** Responsive Tailwind layout usage (`sm:`, `md:`, `lg:` breakpoints across pages/components).
- **JWT auth:** Access + refresh tokens stored in `sessionStorage` with `localStorage` fallback; role-based protected routes.
- **APIs:** REST-style endpoints served via NGINX path routing; Next.js also exposes routes under `/api/*` for storage-backed asset serving.
- **SEO:** `metadata` in `app/web-vite/src/App.tsx`, plus `public/robots.txt` and `public/sitemap.xml`.
- **Payment (partial/stub):** Prisma `Payment` model and an `/orders/payment` API route exist; no external payment gateway integration is evidenced in this repo.

## System Design Elements 

- **Server/Hosting:** GCP Compute Engine VM (documented), with NGINX fronting the app.
- **Application:** Next.js web app + Express API (separate processes).
- **Frameworks:** Next.js, Express, Tailwind, Prisma (present), Python engine scripts.
- **Database:** PostgreSQL (Cloud SQL in docs), with Prisma schema and also a SQL schema file + Python migration/seed scripts.
- **Object storage:** Google Cloud Storage is used for static assets and uploads (documented; code uses `@google-cloud/storage`).
- **API type:** REST (Express routes, JSON payloads).

## Core Concepts (

- **Middleware-based auth and RBAC** on the API side (`requireAuth`, role checks).
- **Schema validation** for request bodies via Zod.
- **Monorepo modularization** via pnpm workspaces (web/api/types/config).
