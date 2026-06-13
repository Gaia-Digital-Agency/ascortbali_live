# Implemented Feature Summary

Current implemented feature set for the deployed `Baligirls` app.

Current live routing state:

- Public web runs from `/`
- Public API runs from `/api/*`
- Admin portal runs from `/admin` and `/admin/logged`
- User portal runs from `/user` and `/user/logged`
- Creator portal runs from `/creator`, `/creator/register`, and `/creator/logged`
- Legacy `/baligirls` path is no longer the primary live route

## Public Site

- Homepage under `/`
- Creator listing cards driven by provider data
  - Card NAME strip (`h-14` / 56 px) shows the creator display name only. The 4 **DEMS** category icons (Dating / Escort / Massage / Sugar-babies) are overlaid on the image at bottom-right, inside a translucent `backdrop-blur` panel. Each icon is a circle-bound SVG, gold-filled when the creator's `providers.escort_type` CSV includes that token and dim charcoal otherwise. Source: [`app/web-vite/src/components/DemsIcons.tsx`](../../app/web-vite/src/components/DemsIcons.tsx).
  - The 4 **Featured Girls** carousel cards on the homepage use the same DEMS overlay (bottom-right, blurred backdrop) so the featured row matches the in-grid creator cards. Rendered by `FeaturedCarousel` in [`app/web-vite/src/components/AdvertisingSpaces.tsx`](../../app/web-vite/src/components/AdvertisingSpaces.tsx); `escort_type` is returned by `GET /creators/by-names`.
- Filtering controls for creator discovery
- Ad placement display for `home-1`, `home-2`, `home-3`, and bottom text slot
- Public creator preview pages under `/creator/preview/[id]`
- Legal pages under `/terms` and `/privacy`
- Age-gate modal / first-visit consent flow

## User Flows

- User registration with email-based login
- User login and forgot-password reset flow
- User profile edit page under `/user/logged`
- Auth-aware navigation and logout
- Service detail page can create orders through `BuyButton`

## Creator Flows

- Creator registration
- Creator login and forgot-password reset flow
- Creator profile management under `/creator/logged`
- Creator image slot management
- Creator image uploads via `POST /api/upload` with GCS-backed retrieval under `/api/uploads/<object-key>`
- Creator activation/deactivation state stored through profile updates
- Public creator preview rendering from provider/profile/image data

## Admin Flows

- Admin login and forgot-password reset flow
- Admin dashboard under `/admin/logged`
- User account management
- Creator account management
- Ad slot management
- Basic stats and analytics/status visibility

## API Capability Areas

- Authentication and token refresh
- User profile CRUD
- Creator profile CRUD
- Creator image CRUD
- GCS-backed upload, upload retrieval, admin-asset, clean-image, and static asset proxy routes
- Ads listing and admin ad management
- Public creator listing/detail APIs
- Service listing/detail APIs
- Order creation and payment recording
- Visitor analytics capture and auth-linked analytics events

## Not Included Here

- Detailed endpoint lists are documented separately in `references/manage/buttons_api.md` and `references/manage/auto_api.md`.
- Data model notes are documented separately in `references/manage/schema.md`.
