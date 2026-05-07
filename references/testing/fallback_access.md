# Fallback Access + Password Rules

This doc captures the fallback login/password rules used by the app in production.

## Portals

### Admin
- Portal: `admin`
- Login endpoint: `POST /auth/login`
- Fallback password: `admin123` (always accepted for admin accounts)
- Stored password: `app_accounts.password` (admins can set this to anything)

### User
- Portal: `user`
- Login endpoint: `POST /auth/login`
- Fallback password: `user123` (always accepted for user accounts)
- Stored password: `app_accounts.password` (users can set this to anything)

### Creator
- Portal: `creator`
- Login endpoint: `POST /auth/login`
- Fallback password: `creator123` (accepted for all creators)
- Stored password: `providers.password` (creators can set this to anything)
- Temp password: `providers.temp_password` (kept as-is; intended to be phone digits)
  - Recommended: derived from the creator phone number digits only (no spaces/symbols).

## Change Password

Endpoint:
- `POST /auth/change-password` (requires `Authorization: Bearer <accessToken>`)

Body:
```json
{
  "currentPassword": "your-current-password",
  "newPassword": "your-new-password"
}
```

Rules:
- Admin/User: `currentPassword` can be their stored password or the fallback (`admin123` / `user123`).
- Creator: `currentPassword` can be their stored password, their `temp_password`, or the fallback `creator123`.
- Changing password updates only the primary stored password (`app_accounts.password` or `providers.password`).
- `temp_password` is never overwritten by password change.

## Notes

- In production the site is mounted at base path `/baligirls`, so public URLs look like:
  - Web: `/baligirls/...`
  - API (via NGINX): `/baligirls/api/...`
  - API (direct on VM loopback): `http://127.0.0.1:8001/...`

