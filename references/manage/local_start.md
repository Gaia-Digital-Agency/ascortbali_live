# How to Run Locally

**Prerequisites:**
- PostgreSQL 16 running (`brew services start postgresql@16`)
- DB `ascortbali` exists and is seeded
- PNPM 9.12.3 installed

**Start services (two terminals):**

```bash
# Terminal 1 — Express API (port 4000 locally, 8001 in production)
pnpm --filter @ascortbali/api dev
```

```bash
# Terminal 2 — Vite dev server (port 5173 by default)
cd app/web-vite && pnpm dev
```

| Service | URL | Notes |
|---------|-----|-------|
| Express API | `http://localhost:4000` | Health: `http://localhost:4000/health` → `{"ok":true}` |
| Vite Web (dev) | `http://localhost:5173` | Hot reload enabled |

The Vite dev server proxies `/api/*` to the API server. Configure `VITE_API_BASE_URL` in `app/web-vite/.env` if the API runs on a different port.

> **Note:** The legacy Next.js app in `app/web` is deprecated. Do not use it for new development. All new features go in `app/web-vite`.

---

**If DB is ever lost/reset**, re-seed it first:
```bash
export DATABASE_URL="postgresql://ascort:ascort@localhost:5432/ascortbali"
python3 database/migrate.py   # create tables
python3 database/seed.py      # load creators + images
```

---

## How to Stop / Kill All Services

**If you started in a terminal:**
```
Ctrl + C
```

**If running in the background (force kill):**
```bash
pkill -f "tsx src/index.ts" && pkill -f "vite"
```

**Or kill by port:**
```bash
kill $(lsof -ti :4000) && kill $(lsof -ti :5173)
```

---

## Production-like run locally

```bash
# Build both apps
pnpm --filter @ascortbali/api build
cd app/web-vite && pnpm build

# Start the production SSR server (port 8002)
pnpm start
```
