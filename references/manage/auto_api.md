# Automatic API Calls

This file lists the API calls that are triggered automatically by frontend lifecycle logic rather than by an explicit button press.

## Global / Shared

| API Endpoint | Location | Why it runs automatically |
|---|---|---|
| `POST /analytics/visit` | `app/web/components/AnalyticsBeacon.tsx` | Sends a visit beacon on initial client load. |
| `GET /ads` | `app/web/components/AdvertisingSpaces.tsx` | Loads homepage advertising slots when ad components mount. |
| `GET /me` | `app/web/components/AuthNavButton.tsx` | Resolves current login state and role when auth nav mounts or when focus/auth-change events fire. |
| `POST /auth/refresh` | `app/web/lib/api.ts` | Runs automatically after a `401` to refresh tokens and retry the original request once. |

## User Portal

| API Endpoint | Location | Why it runs automatically |
|---|---|---|
| `GET /me` | `app/web/app/user/logged/page.tsx` | Confirms the current session belongs to a user. |
| `GET /me/user-profile` | `app/web/app/user/logged/page.tsx` | Loads the editable user profile after session validation. |

## Creator Portal

| API Endpoint | Location | Why it runs automatically |
|---|---|---|
| `GET /me` | `app/web/app/creator/logged/page.tsx` | Confirms the current session belongs to a creator. |
| `GET /me/creator-profile` | `app/web/app/creator/logged/page.tsx` | Loads the creator profile after session validation. |
| `GET /me/creator-images` | `app/web/app/creator/logged/page.tsx` | Loads creator image slots after session validation. |

## Public Service / Creator Views

| API Endpoint | Location | Why it runs automatically |
|---|---|---|
| `GET /creators/:uuid` | `app/web/app/creator/preview/[id]/CreatorPreviewClient.tsx` | Loads public creator preview content on page load. |
| `GET /services/:id` | `app/web/app/services/[id]/ServiceDetailClient.tsx` | Loads the requested service detail on page load. |

## Admin Portal

| API Endpoint | Location | Why it runs automatically |
|---|---|---|
| `GET /admin/accounts` | `app/web/app/admin/logged/page.tsx` | Loads account management data for admin dashboard. |
| `GET /admin/stats` | `app/web/app/admin/logged/page.tsx` | Loads dashboard counts. |
| `GET /admin/ads` | `app/web/app/admin/logged/page.tsx` | Loads ad slot configuration. |

## Scope Notes

- This file intentionally excludes user-triggered form submissions and button actions.
- It documents current implemented behavior only.
