# BaliGirls Database Setup

## Prerequisites
- PostgreSQL (`psql` available)
- Python 3 with `psycopg2` (`pip install psycopg2-binary`)

## Steps

### 1. Create the database
Local Postgres:
```bash
createdb ascortbali
```

### 2. Run the schema
Using the script:
```bash
python3 database_engine/migrate.py
```

### 3. Prepare the data (engine pipeline)
Run the engine pipeline (from repo root):
```bash
python3 cleanup_engine/scrape_full_image.py
python3 cleanup_engine/remove_watermark.py
python3 cleanup_engine/build_data.py
```

### 4. Seed the data
```bash
python3 database_engine/seed.py
```

## Files
- `database_engine/schema.sql` — PostgreSQL schema (providers + provider_images tables)
- `app/data/page_data.json` — provider profile data (with `uuid`)
- `app/data/image_data.json` — cleaned image references (links to profile `uuid`)
- `app/Assets/Creator/clean_image/` — cleaned image files referenced in `app/data/image_data.json`
