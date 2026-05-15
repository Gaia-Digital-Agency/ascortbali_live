# Buttons And API Actions

This file documents the main user-triggered actions that call backend APIs in the current app.

## Public / Shared Actions

| UI Element | Location | API |
|---|---|---|
| `BUY` / create order action | `app/web-vite/src/components/BuyButton.tsx` | `POST /orders` |
| `FAVORITE` action | `app/web-vite/src/components/FavoriteButton.tsx` | `POST /me/favorites/:serviceId` |

## Authentication Actions

| UI Element | Location | API |
|---|---|---|
| User login submit | `app/web-vite/src/pages/UserLoginPage.tsx` | `POST /auth/login` |
| User forgot-password verify | `app/web-vite/src/pages/UserLoginPage.tsx` | `POST /auth/forgot-password/verify` |
| User forgot-password reset | `app/web-vite/src/pages/UserLoginPage.tsx` | `POST /auth/forgot-password/reset` |
| User registration submit | `app/web-vite/src/pages/UserRegisterPage.tsx` | `POST /auth/register` |
| Creator login submit | `app/web-vite/src/pages/CreatorLoginPage.tsx` | `POST /auth/login` |
| Creator forgot-password verify | `app/web-vite/src/pages/CreatorLoginPage.tsx` | `POST /auth/forgot-password/verify` |
| Creator forgot-password reset | `app/web-vite/src/pages/CreatorLoginPage.tsx` | `POST /auth/forgot-password/reset` |
| Creator registration submit | `app/web-vite/src/pages/CreatorRegisterPage.tsx` | `POST /auth/register/creator` |
| Admin login submit | `app/web-vite/src/pages/AdminLoginPage.tsx` | `POST /auth/login` |
| Admin forgot-password verify | `app/web-vite/src/pages/AdminLoginPage.tsx` | `POST /auth/forgot-password/verify` |
| Admin forgot-password reset | `app/web-vite/src/pages/AdminLoginPage.tsx` | `POST /auth/forgot-password/reset` |

## User Portal Actions

| UI Element | Location | API |
|---|---|---|
| Save user profile | `app/web-vite/src/pages/UserLoggedPage.tsx` | `PUT /me/user-profile` |
| Change user password | `app/web-vite/src/pages/UserLoggedPage.tsx` | `POST /auth/change-password` |

## Creator Portal Actions

| UI Element | Location | API |
|---|---|---|
| Save creator profile | `app/web-vite/src/pages/CreatorLoggedPage.tsx` | `PUT /me/creator-profile` |
| Change creator password | `app/web-vite/src/pages/CreatorLoggedPage.tsx` | `POST /auth/change-password` |
| Save uploaded creator image slot | `app/web-vite/src/pages/CreatorLoggedPage.tsx` | `POST /me/creator-images` |
| Delete creator image | `app/web-vite/src/pages/CreatorLoggedPage.tsx` | `DELETE /me/creator-images/:imageId` |
| Activate/deactivate creator profile | `app/web-vite/src/pages/CreatorLoggedPage.tsx` | `PUT /me/creator-profile` |

## Admin Portal Actions

| UI Element | Location | API |
|---|---|---|
| Update user account | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `PUT /admin/accounts/users/:id` |
| Delete user account | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `DELETE /admin/accounts/users/:id` |
| Update creator account | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `PUT /admin/accounts/creators/:id` |
| Delete creator account | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `DELETE /admin/accounts/creators/:id` |
| Create ad slot entry | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `POST /admin/ads` |
| Update ad slot | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `PUT /admin/ads/:slot` |
| Delete ad slot | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `DELETE /admin/ads/:slot` |
| Change admin password | `app/web-vite/src/pages/AdminLoggedPage.tsx` | `POST /auth/change-password` |

## Notes

- Navigation-only buttons such as `LOGIN`, `REGISTER`, `BACK HOME`, `EDIT PROFILE`, and `LOGOUT` are not API actions unless they submit a form or call a backend route.
- This file is intended to reflect the current code, not planned features.
