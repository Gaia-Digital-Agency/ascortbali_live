# Buttons And API Actions

This file documents the main user-triggered actions that call backend APIs in the current app.

## Public / Shared Actions

| UI Element | Location | API |
|---|---|---|
| `BUY` / create order action | `app/web/components/BuyButton.tsx` | `POST /orders` |
| `FAVORITE` action | `app/web/components/FavoriteButton.tsx` | `POST /me/favorites/:serviceId` |

## Authentication Actions

| UI Element | Location | API |
|---|---|---|
| User login submit | `app/web/app/user/page.tsx` | `POST /auth/login` |
| User forgot-password verify | `app/web/app/user/page.tsx` | `POST /auth/forgot-password/verify` |
| User forgot-password reset | `app/web/app/user/page.tsx` | `POST /auth/forgot-password/reset` |
| User registration submit | `app/web/app/user/register/page.tsx` | `POST /auth/register` |
| Creator login submit | `app/web/app/creator/page.tsx` | `POST /auth/login` |
| Creator forgot-password verify | `app/web/app/creator/page.tsx` | `POST /auth/forgot-password/verify` |
| Creator forgot-password reset | `app/web/app/creator/page.tsx` | `POST /auth/forgot-password/reset` |
| Creator registration submit | `app/web/app/creator/register/page.tsx` | `POST /auth/register/creator` |
| Admin login submit | `app/web/app/admin/page.tsx` | `POST /auth/login` |
| Admin forgot-password verify | `app/web/app/admin/page.tsx` | `POST /auth/forgot-password/verify` |
| Admin forgot-password reset | `app/web/app/admin/page.tsx` | `POST /auth/forgot-password/reset` |

## User Portal Actions

| UI Element | Location | API |
|---|---|---|
| Save user profile | `app/web/app/user/logged/page.tsx` | `PUT /me/user-profile` |
| Change user password | `app/web/app/user/logged/page.tsx` | `POST /auth/change-password` |

## Creator Portal Actions

| UI Element | Location | API |
|---|---|---|
| Save creator profile | `app/web/app/creator/logged/page.tsx` | `PUT /me/creator-profile` |
| Change creator password | `app/web/app/creator/logged/page.tsx` | `POST /auth/change-password` |
| Save uploaded creator image slot | `app/web/app/creator/logged/page.tsx` | `POST /me/creator-images` |
| Delete creator image | `app/web/app/creator/logged/page.tsx` | `DELETE /me/creator-images/:imageId` |
| Activate/deactivate creator profile | `app/web/app/creator/logged/page.tsx` | `PUT /me/creator-profile` |

## Admin Portal Actions

| UI Element | Location | API |
|---|---|---|
| Update user account | `app/web/app/admin/logged/page.tsx` | `PUT /admin/accounts/users/:id` |
| Delete user account | `app/web/app/admin/logged/page.tsx` | `DELETE /admin/accounts/users/:id` |
| Update creator account | `app/web/app/admin/logged/page.tsx` | `PUT /admin/accounts/creators/:id` |
| Delete creator account | `app/web/app/admin/logged/page.tsx` | `DELETE /admin/accounts/creators/:id` |
| Create ad slot entry | `app/web/app/admin/logged/page.tsx` | `POST /admin/ads` |
| Update ad slot | `app/web/app/admin/logged/page.tsx` | `PUT /admin/ads/:slot` |
| Delete ad slot | `app/web/app/admin/logged/page.tsx` | `DELETE /admin/ads/:slot` |
| Change admin password | `app/web/app/admin/logged/page.tsx` | `POST /auth/change-password` |

## Notes

- Navigation-only buttons such as `LOGIN`, `REGISTER`, `BACK HOME`, `EDIT PROFILE`, and `LOGOUT` are not API actions unless they submit a form or call a backend route.
- This file is intended to reflect the current code, not planned features.
