# Baligirls - Client Brief

**Date:** April 13, 2026
**Developed by:** Gaida.com
**Copyright (C) 2026**

---

## Overview

Baligirls is a multi-role web application for creator discovery and services marketplace, served from the domain root.

- **Stack:** Next.js 14 (frontend) + Express (API) + PostgreSQL + Google Cloud Storage
- **Hosting:** GCP VM with PM2 process manager and NGINX reverse proxy
- **Repo:** `git@github.com:Gaia-Digital-Agency/ascortbali_staging.git`

---

## URL Structure

| Page | URL |
|------|-----|
| Public site | http://baligirls.gaiada.online |
| Public API | http://baligirls.gaiada.online/api |
| Admin login | http://baligirls.gaiada.online/admin |
| User login | http://baligirls.gaiada.online/user |
| Creator login | http://baligirls.gaiada.online/creator |
| Creator preview | http://baligirls.gaiada.online/creator/preview/[id] |
| Terms & Conditions | http://baligirls.gaiada.online/terms |
| Privacy Policy | http://baligirls.gaiada.online/privacy |

- Web traffic under `/` routes to internal Next.js on `127.0.0.1:3001`
- API traffic under `/api` routes to internal Express API on `127.0.0.1:8001`

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

## Creator Info Sample For Whatsapp Invite

### Alice

| Field | Value |
|-------|-------|
| Username | `alice@email.com` |
| Password | `380954174109` |
| Phone | +380 954 174 109 |
| Location | Bali, Indonesia |

### Alicia Sasya

| Field | Value |
|-------|-------|
| Username | `alicia-sasya@email.com` |
| Password | `6282144027184` |
| Phone | +62 821 440 27184 |
| Location | Bali, Indonesia |

### Anggun

| Field | Value |
|-------|-------|
| Username | `anggun@email.com` |
| Password | `62881037893179` |
| Phone | +62 881 037 893179 |
| Location | Bali, Indonesia |

Full creator list available in `references/features/creator_info.md`.

## User Flows

- User registration with email-based login
- User login and forgot-password reset flow
- User profile edit page under `/user/logged`
- Auth-aware navigation and logout
- Service detail page with order creation via Buy button
- Favorite services

## Creator Flow

- Creator registration
- Creator login and forgot-password reset flow
- Creator profile management under `/creator/logged`
- Creator image slot management (upload, replace, delete)
- Image uploads via GCS-backed storage
- Creator activation/deactivation state
- Public creator preview rendering from profile and image data

## Admin Flow

- Admin login and forgot-password reset flow
- Admin dashboard under `/admin/logged`
- User account management (view, edit, delete)
- Creator account management (view, edit, delete)
- Ad slot management (home-1, home-2, home-3, bottom text)
- Basic stats and analytics visibility

## API Capability Areas

| Area | Capabilities |
|------|-------------|
| **Auth** | Login (admin/user/creator), token refresh, forgot-password verify + reset, change password |
| **User** | Profile CRUD |
| **Creator** | Profile CRUD, image CRUD |
| **Media** | GCS upload, upload retrieval, admin-asset proxy, clean-image proxy, static asset proxy |
| **Ads** | Listing, admin ad management |
| **Public** | Creator listing/detail, service listing/detail |
| **Commerce** | Order creation, payment recording |
| **Analytics** | Visitor capture, geo-lookup, auth-linked analytics events |

## Overall Site Summary

From the development readiness audit (Feb 2026):

| Metric | Score |
|--------|-------|
| Desktop Performance | 95 |
| Mobile Performance | 74 |
| SEO | 100 |
| Accessibility | 98 |
| Pages Scanned | 20 |
| Console Errors | 0 |
