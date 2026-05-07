# Data Injection Guide

After running the engine pipeline locally, follow these steps to get the new creator data live on the server.

## Step 1: Upload clean images to GCS

```bash
# From your local machine, in the project root
gcloud storage rsync --recursive \
  app/Assets/Creator/clean_image \
  gs://gda-s01-bucket/baligirls/static/clean-image
```

This puts all images where the app's `/api/clean-image/[filename]` route reads from.

---

## Step 2: Copy JSON data to server

```bash
scp -i ~/.ssh/gda-ce01 \
  app/data/page_data.json \
  app/data/image_data.json \
  azlan@34.124.244.233:/var/www/baligirls/app/data/
```

## Step 3: Run seed.py on server to load into Cloud SQL

```bash
ssh -i ~/.ssh/gda-ce01 azlan@34.124.244.233 \
  "cd /var/www/baligirls && python3 database/seed.py"
```

The seed script **upserts** — it inserts new creators and updates existing ones based on `provider_id`. So your existing 2 creators stay, and the 130 new ones get added.


## Step 4: Restart the app

```bash
ssh -i ~/.ssh/gda-ce01 azlan@34.124.244.233 \
  "pm2 restart baligirls-api baligirls-web"
```

## Why this works

- **API** queries Cloud SQL at runtime → new providers show up immediately after seed
- **Images** are served from GCS → available as soon as the rsync completes
- **No code changes needed** — the app already handles N creators dynamically

## How IDs, UUIDs, and images are linked

### The Linking Chain

```
Scraper assigns each creator a profile ID (e.g. "835389")
  ↓
build_data.py generates a UUID for each profile ID
  ↓  and maps image filenames to that UUID
  ↓
  ├── page_data.json:  { "ID": "835389", "uuid": "a1b2c3...", "name": "callista", ... }
  │
  └── image_data.json: { "id": "IM_835389_01", "profile_id": "835389", "page_uuid": "a1b2c3...", "file": "app/Assets/Creator/clean_image/IM_835389_01.jpg" }
```

### How the IDs tie together in Cloud SQL

| Table | Key | Links To |
|---|---|---|
| `providers` | `uuid` (PK) = `"a1b2c3..."` | — |
| `providers` | `provider_id` (unique) = `"835389"` | original scrape ID |
| `provider_images` | `provider_uuid` = `"a1b2c3..."` | → `providers.uuid` |
| `provider_images` | `provider_id` = `"835389"` | → `providers.provider_id` |
| `provider_images` | `image_id` = `"IM_835389_01"` | matches filename in GCS |
| `provider_images` | `sequence_number` = `1` (extracted from `_01`) | slot 1-7 |

### How GCS maps to the database

The image filename is the link:

- DB stores: `image_file = "app/Assets/Creator/clean_image/IM_835389_01.jpg"`
- GCS stores: `gs://gda-s01-bucket/baligirls/static/clean-image/IM_835389_01.jpg`
- App serves: `/api/clean-image/IM_835389_01.jpg` → reads from GCS

### The upserts are safe

- `seed.py` uses **`ON CONFLICT (uuid) DO UPDATE`** for providers — existing creators get updated, new ones get inserted
- Uses **`ON CONFLICT (image_id) DO UPDATE`** for images — same behavior
- Images capped at **sequence 1-7** per creator (line 232-233)

The `profile_id` from the scraper flows through `build_data.py` as the glue that ties the UUID, provider data, image filenames, and GCS paths all together. Everything stays consistent.
