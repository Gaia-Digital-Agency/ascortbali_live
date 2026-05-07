# Start Script (Local)

## Known-good quick start

1) Ensure web env has:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
```

File: `/Users/rogerwoolie/Downloads/AscortBali/app/web/.env`

2) Clear occupied ports before startup:

```bash
lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
lsof -tiTCP:4000 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
```

3) Start in two terminals (recommended):

Terminal A (API):

```bash
cd /Users/rogerwoolie/Downloads/AscortBali
pnpm --filter @ascortbali/api dev
```

Terminal B (Web):

```bash
cd /Users/rogerwoolie/Downloads/AscortBali
pnpm --filter @ascortbali/web dev
```

## 1) Start PostgreSQL

```bash
brew services start postgresql@16
```

If your service name differs:

```bash
brew services list
```

## 2) One-time DB setup (or after schema/data changes)

```bash
cd /Users/rogerwoolie/Downloads/AscortBali
export DATABASE_URL=postgresql://ascort:ascort@localhost:5432/ascortbali
python3 database/migrate.py
python3 database/seed.py
```

## 3) Start app (recommended: two terminals)

Terminal A (API):

```bash
cd /Users/rogerwoolie/Downloads/AscortBali
pnpm --filter @ascortbali/api dev
```

Terminal B (Web):

```bash
cd /Users/rogerwoolie/Downloads/AscortBali
pnpm --filter @ascortbali/web dev
```

## 4) Alternative single command

```bash
cd /Users/rogerwoolie/Downloads/AscortBali
pnpm dev
```

Use this only when port `4000` is free.

## 5) URLs

- Web: `http://localhost:3000`
- API health: `http://127.0.0.1:4000/health`

## 6) Test credentials (MVP)

- Test Admin: `admin` / `admin123`
- Test User: `user` / `user123`
- Creator 1: `callista` / `6282144288224`
- Creator 2: `mary` / `380669265774`

Creator credential rule (all creators):
- Username = creator `name`
- Password = creator `temp_password` normalized to digits only
- If `temp_password` has no digits, fallback uses phone/cell digits from data

## 7) Stop

Stop app terminals:

- `Ctrl+C`

Stop PostgreSQL:

```bash
brew services stop postgresql@16
```

## 8) Quick troubleshooting

If API says `EADDRINUSE: 127.0.0.1:4000`:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
kill <PID>
```
