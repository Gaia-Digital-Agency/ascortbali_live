# GCP PostgreSQL Details (Staging)

Last verified: 2026-02-08

## Project and Instance

- Project ID: `gda-viceroy`
- Cloud SQL instance name: `baligirls`
- Engine: `PostgreSQL`
- Region: `asia-southeast1`
- Instance zone: `asia-southeast1-c`
- Connection name: `gda-viceroy:asia-southeast1:baligirls`

## Network and IP

- Public primary IP: `136.110.3.46`
- Outgoing IP: `34.158.40.152`
- Authorized network (staging VM): `34.124.244.233/32`

## Database

- App database: `ascortbali`
- Default/system database: `postgres`

## Users

- `postgres` (BUILT_IN)

## Password (Current)

- `postgres` password: `password123`

## Connection String (Current Staging)

- `postgresql://postgres:password123@136.110.3.46:5432/ascortbali?sslmode=require`

## Current Tables in `ascortbali`

- `ActivityLog`
- `Category`
- `Favorite`
- `Language`
- `Order`
- `Payment`
- `ProviderLanguage`
- `ProviderProfile`
- `RefreshToken`
- `Service`
- `User`
- `UserProfile`
- `Visitor`
- `VisitorUserLink`
- `advertising_space_history`
- `advertising_spaces`
- `app_accounts`
- `provider_images`
- `providers`
- `user_profiles`

## Important Security Notes

- This password is temporary and must be rotated.
- Do not keep plaintext production credentials in repo files.
- For production, use Secret Manager and private DB connectivity (or Cloud SQL Auth Proxy).
