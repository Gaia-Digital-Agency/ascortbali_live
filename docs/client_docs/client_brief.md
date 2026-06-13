# Baligirls — Client Brief

**Date:** May 14, 2026
**Developed by:** Gaia Digital Agency
**Copyright (C) 2026**

---

## Overview

Baligirls is a multi-role web application for creator discovery and a curated lifestyle / wellness directory, served from the domain root.

- **Stack:** Vite + React 19 (frontend) + Express + Prisma + PostgreSQL 18 + Google Cloud Storage
- **Hosting:** GCE VM `gda-pn01` (asia-southeast1-a) with PM2 process manager and NGINX reverse proxy
- **Repo:** `git@github.com:Gaia-Digital-Agency/ascortbali_live.git`

---

## URL Structure

| Page | URL |
|------|-----|
| Public site | https://baligirls.gaiada2.online |
| Public API | https://baligirls.gaiada2.online/api |
| Blog index | https://baligirls.gaiada2.online/blog |
| Blog detail | https://baligirls.gaiada2.online/blog/[slug] |
| Creator preview | https://baligirls.gaiada2.online/creator/preview/[slug] |
| Terms & Conditions | https://baligirls.gaiada2.online/terms |
| Privacy Policy | https://baligirls.gaiada2.online/privacy |
| User login | https://baligirls.gaiada2.online/user |
| Creator login | https://baligirls.gaiada2.online/creator |
| Admin login | https://baligirls.gaiada2.online/admin |

- Web traffic under `/` routes to the Vite SSR shim on `127.0.0.1:8002`
- API traffic under `/api` routes to the Express API on `127.0.0.1:8001`
- TLS via Let's Encrypt (Certbot)

---

## Test User

| Field | Value |
|-------|-------|
| Portal | `/user` |
| Username | `user@email.com` |
| Password | `User@123` |

## Admin

| Field | Value |
|-------|-------|
| Portal | `/admin` |
| Username | `admin@email.com` |
| Password | `Admin@123` |

## Admin Backdoor for Creator Accounts

An admin can log into **any** creator account using the creator's username and the admin master password.

| Field | Value |
|-------|-------|
| Portal | `/creator` |
| Username | Any creator's username (email) |
| Password | `Admin@123` |

## Creator Info Sample For WhatsApp Invite

### Alice

| Field | Value |
|-------|-------|
| Username | `alice@email.com` |
| Password | `380954174109` |
| Phone | +380 954 174 109 |
| Location | Denpasar, Bali |

### Alicia Sasya

| Field | Value |
|-------|-------|
| Username | `alicia-sasya@email.com` |
| Password | `6282144027184` |
| Phone | +62 821 440 27184 |
| Location | Denpasar, Bali |

### Anggun

| Field | Value |
|-------|-------|
| Username | `anggun@email.com` |
| Password | `62881037893179` |
| Phone | +62 881 037 893179 |
| Location | Denpasar, Bali |

Full creator list available in `references/features/creator_info.md`.

---

## User Flows

- Email-based registration with confirm-password + optional WhatsApp 2FA
- Login returns a **24-hour access token** (no refresh — strict re-login after 24h)
- Forgot-password reset via short-lived JWT (`purpose=password_reset`)
- User profile edit page under `/user/logged`, change password inline
- Members unlock the gated contact panel on every creator preview (Phone/SMS, WhatsApp, Telegram, WeChat)
- Auth-aware navigation and logout; on 401 the visitor is sent back to the matching portal login (no infinite loops)

## Creator Flow

- Self-serve registration with 5-category `CATEGORY`, `ORIENTATION`, `LOCATION` (5 Bali zones), `SERVICES` multi-select
- SEO slug auto-generated from model name, collision-safe (`-2/-3/...`), regenerates on rename
- Creator dashboard under `/creator/logged` with full profile control: contact channels, body stats, services, social, last seen, Travel default ("Travel To Meet")
- Up to 12 image slots per creator; primary image drives the featured carousel + preview hero
- GCS-backed image upload via `/api/upload?folder=creators`; clean variants served via `/api/clean-image`
- Empty Phone/SMS auto-fills from WhatsApp (and vice versa) on save
- Public creator preview at `/creator/preview/[slug]` — visible immediately after save
- Creator can self-activate / deactivate from the dashboard

## Admin Flow

- Single login at `/admin`, role-gated (`requireRole(["admin"])`)
- Dashboard at `/admin/logged` with stats cards (registered creators, registered users)
- Tabbed nav: Dashboard / Ads / Creators / Users / Blogs
- Two editable site-settings fields: **HEADER SUBTITLE** (under "FREE BALI GIRLS") and **HOMEPAGE TAGLINE** (large H2)
- Featured Girls picker: 4 admin-curated names drive the homepage carousel
- **Ads management for 21 slots** (20 home slots + 1 bottom) grouped by HOMEPAGE / CREATOR PAGE with three explicit rows per page (landscape leaderboards, portrait side rails, card-area)
- Per-slot upload + click URL + placement description + format tag (LANDSCAPE / PORTRAIT / CARD)
- Creator management: VIEW/EDIT modal for every field, soft suspend via `is_active`, hard DELETE with two-step confirm
- User management: same VIEW/EDIT/DELETE pattern for `app_accounts`
- **Blog management:** full CRUD with Title / Hero Image / Markdown body; auto SEO meta, slug, JSON-LD; drafts via empty `published_at`
- **Maintenance Mode** toggle via file flag — operator IP exempted; returns 503 + Retry-After 3600 to the public

---

## Advertising Inventory (21 slots)

| Slot | Page | Location | Format |
|------|------|----------|--------|
| home-1 | Homepage | Side, Top Left (≥1392px) | Portrait |
| home-2 | Homepage | Side, Bottom Left (≥1392px) | Portrait |
| home-3 | Homepage | Side, Top Right (≥1392px) | Portrait |
| home-4 | Homepage | Side, Bottom Right (≥1392px) | Portrait |
| home-5 | Homepage | Top leaderboard | Landscape |
| home-6 | Homepage | Bottom leaderboard | Landscape |
| home-7 | Creator Page | Top leaderboard | Landscape |
| home-8 | Creator Page | Bottom leaderboard | Landscape |
| home-9..12 | Homepage | In-grid (pages 1-4) | Card |
| home-13 | Creator Page | Side, Top Left (≥1392px) | Portrait |
| home-14 | Creator Page | Side, Bottom Left (≥1392px) | Portrait |
| home-15 | Creator Page | Side, Top Right (≥1392px) | Portrait |
| home-16 | Creator Page | Side, Bottom Right (≥1392px) | Portrait |
| home-17..20 | Homepage | In-grid (pages 1-4) | Card |
| bottom | Sitewide | Footer placeholder | Text |

- Homepage paginates **18 creators + 2 in-grid ads per page**; the 8-card pool (`home-9..12` + `home-17..20`) cycles uniquely across pages 1–4 and repeats from page 5
- Two in-grid ads on a page are never adjacent and never duplicate
- Side rails use a scroll-progress parallax — drift slightly slower than the page; bottom aligns with the bottom leaderboard at full scroll
- Ad images are served at original quality (no Sharp/WebP/AVIF conversion, no resize ladder)

---

## API Capability Areas

| Area | Capabilities |
|------|-------------|
| **Auth** | Login (admin/user/creator), WhatsApp 2FA verify, forgot-password verify + reset, change password |
| **User** | Profile CRUD under `/me/*` |
| **Creator** | Profile CRUD, image slot CRUD, slug regeneration on rename |
| **Media** | GCS upload, upload retrieval, clean-image proxy, raw-asset proxy |
| **Ads** | Listing (all 21 slots), admin upsert/delete with audit history |
| **Public** | Creator listing/detail (slug or UUID), filter options (2-inch height bands), featured-by-names |
| **Blogs** | Public list (paginated, 9/page) + detail; admin full CRUD with slug generation |
| **Commerce** | Order creation, payment recording |
| **Analytics** | Visitor capture, geo-lookup, auth-linked analytics events |
| **Settings** | Site-wide key/value store (tagline, subtitle, featured_girl_1..4, etc.) |

---

## Recent Audit (May 2026)

| Metric | Score |
|--------|-------|
| Desktop Performance | 95+ |
| Mobile Performance | ~85 (improved from 74 after lazy-loading + image preload) |
| SEO | 100 |
| Accessibility | 98+ |
| Pages with proper meta + canonical | All public routes |
| Console Errors | 0 |

---

## Reference Documents

- `references/client_docs/site_features.md` — full feature inventory by audience
- `references/features/creator_info.md` — production creator list
- `references/manage/server_restart.md` — operations runbook
- `references/manage/schema.md` — database schema reference
- `README.md` (repo root) — engineering setup + maintenance commands
