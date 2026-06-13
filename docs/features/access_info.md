# Access

This file lists the current seeded access information found in the codebase.

## Test User

- Portal: `/user`
- Username: `user@email.com`
- Password: `User@123`
- Source: `database_engine/seed.py`

## Admin

- Portal: `/admin`
- Username: `admin@email.com`
- Password: `Admin@123`
- Source: `database_engine/seed.py`

## Creator Seed Access Information

There is no single shared creator master account in the seed logic.

Seeded creator access is generated per provider record from `app/data/page_data.json` in `database_engine/seed.py`:

- Portal: `/creator`
- Username rule: lowercased provider `name`
- Password rule:
  - use `temp_password` if present
  - otherwise use digits from `Phone Number`
  - otherwise use digits from `Cell phone`
  - otherwise use the provider `ID`

Example seeded creator account:

- Username: `alisa`
- Password: `77475068586`
- Source row: `app/data/page_data.json`

## Admin Backdoor for Creator Accounts

An admin can log into any creator account using the creator's username and the admin master password:

- Portal: `/creator`
- Username: any creator's username (email)
- Password: `Admin@123`
- Source: `app/api/src/routes/auth.ts` (FALLBACK_PASSWORDS.admin accepted on creator login)

Notes:

- The creator login screen currently shows UI placeholder values `callista@email.com` / `secretcreator123`, but the seeded creator import logic uses provider usernames and passwords as described above.
- If a creator changed their password through the app, the current live database value may differ from the original seed value.
