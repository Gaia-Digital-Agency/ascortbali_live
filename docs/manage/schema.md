# Data Model Notes

Current data-model reference for the deployed `Baligirls` app.

## Important Constraint

The running app is not backed by one clean Prisma schema.

It currently uses:

- Direct SQL tables queried through `pg`
- Prisma-managed models used by `services` and `orders`

Because of that, this file documents the implemented storage shape at a high level instead of pretending the whole app is represented by one Prisma file.

## SQL-Backed Tables Used Directly By Routes

Primary tables observed in current route code:

- `app_accounts`
  - user/admin credentials and account metadata
- `user_profiles`
  - extended user profile fields
- `providers`
  - creator accounts and creator profile data
- `provider_images`
  - creator image slot records
- `advertising_spaces`
  - homepage ad slots and bottom text slot
- `advertising_space_history`
  - ad slot history/audit trail
- `visitor_analytics`
  - visit analytics records

## Prisma-Backed Models Used By Current Routes

Current Prisma-backed route areas:

- `Service`
- `Order`
- `Payment`
- related Prisma relations used by service/order APIs

These are used by:

- `app/api/src/routes/services.ts`
- `app/api/src/routes/orders.ts`

## Route-To-Data Mapping

### Auth / Account

- `auth.ts`
  - reads/writes `app_accounts`
  - reads/writes `providers`
  - creates `user_profiles` during user registration

### User / Creator Self-Service

- `me.ts`
  - reads/writes `user_profiles`
  - reads/writes `providers`
  - reads/writes `provider_images`

### Admin

- `admin.ts`
  - reads/writes `app_accounts`
  - reads/writes `providers`
  - reads/writes `advertising_spaces`
  - writes `advertising_space_history`

### Public Creator / Ads / Analytics

- `creators.ts`
  - reads `providers`
  - reads `provider_images`
- `ads.ts`
  - reads `advertising_spaces`
- `analytics.ts`
  - reads/writes `visitor_analytics`

### Services / Orders

- `services.ts`
  - Prisma-backed service records
- `orders.ts`
  - Prisma-backed orders and payments

## Operational Implications

- Schema changes must be checked in both SQL-query code and Prisma-backed code.
- Production behavior can break if a column exists in one environment but not another, even when TypeScript compiles cleanly.
- Documentation and migrations should reference the actual table/column usage in routes, not an aspirational unified schema.
