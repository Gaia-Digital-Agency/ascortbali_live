# BaliGirls Data Cleanup Pipeline

End-to-end process for turning a raw `bg_data_NN.xlsx` + `images_NN/` folder into a `bg_data_cleaned_NN.xlsx` ready for live import to the baligirls site.

This is the exact sequence we ran for batches 01 (70 creators) and 02 (63 creators) in May 2026. Re-use it for every future batch.

## Workspace

All batch work happens in **`/var/www/baligirls/creator_engine/`** (renamed from `temp_baligirls/` on 2026-05-15). All paths in this doc are relative to that directory unless prefixed with `/`.

After each successful live import, the per-batch artifacts are merged into the canonical baseline and the per-batch files are deleted:

| File | Role |
|---|---|
| `bg_data_combined.xlsx` | All raw rows ever imported (134 rows after batches 01+02) — the dedup source for new raw batches |
| `bg_data_cleaned_combined.xlsx` | All cleaned rows ever imported (133 rows after 01+02) — the dedup source for the cleaned-side check |
| `images_combined/` | All creator media ever uploaded (153 files after 01+02) + `avatar-default-lady.png` placeholder — the dedup source for new image folders |
| `creator_credentials.csv` | Credentials for every active creator (regenerated each batch) |
| `import_baligirls.py` | The import driver (dry-run / live) |
| `import_run/` | Generated SQL + GCS shell + summary for the most recent run (gitignored) |

The `_combined` files and `images_combined/` are the **canonical state** between batches. The per-batch `bg_data_NN.xlsx`, `bg_data_cleaned_NN.xlsx`, `images_NN/` only exist while a batch is in flight.

---

## 0. Inputs

| Input | Format |
|---|---|
| `bg_data_NN.xlsx` | 20-column source spreadsheet (Phone Number, Name, Body, Face, Ethnicity, Gender, Age, Services, Escort, Bride, Sugar, Massage, Orientation, Available For, Meeting With, Tattoo, Piercing, Location, Eyes, Hair Color) |
| `images_NN/` | Folder of media files named `<phone>-NN.<ext>` where ext ∈ {png, jpeg, jpg, mp4} |

## Output

| Output | Format |
|---|---|
| `bg_data_cleaned_NN.xlsx` | 36-column transformed spreadsheet matching the site/DB schema |
| `images_NN/` (unchanged) | Source folder, dedup'd against the combined baseline |
| `creator_credentials.csv` | name / username / temp_password (regenerated each batch) |

---

## Step 1 — Cross-batch dedup (skip if it's the first ever batch)

Before anything else, remove duplicates that already exist in the combined baseline.

### Image dedup
For each file in `images_NN/`, if a file with the **same name** exists in `images_combined/`, **delete it from the new folder**. (Same filename = same source image, since names are phone-derived.)

### XLSX dedup
For each row in `bg_data_NN.xlsx`, if its **phone digits** match any row in `bg_data_cleaned_combined.xlsx`, **delete that row from the new file**.

The "Phone Number" column is the unique key. Normalise both sides with `digits_only(value)` before comparing.

## Step 2 — Drop unusable rows

Apply these filters in order, dropping the row entirely each time:

1. **No phone number** → drop (can't login without a phone-based password).
2. **Phone matches an existing live DB row** → drop (duplicate person).
   ```sql
   SELECT username FROM providers WHERE REGEXP_REPLACE(phone_number,'[^0-9]','','g') = '<phone>';
   ```
3. **`Name = N/A` AND no images attached** → drop.

## Step 3 — Recover usable N/A rows

For rows where `Name = "N/A"` **but images exist**: assign a real Indonesian feminine name from the recovery pool. Pick a name that doesn't clash with the DB or this batch's other rows.

Pool used so far (extend as needed, never reuse):

| Batch 01 used | Batch 02 used | Still available |
|---|---|---|
| Maya, Sari, Ayu, Indah, Citra, Bunga | Wulan, Tara | Sinta, Nila, Putri, Andini, Mira, Nadia, Dinda, Mela, Tania … |

**Never** assign placeholder names like `Creator-9335` or `Anon`. Use real first names so the public profile reads naturally.

## Step 4 — Resolve name clashes (slug uniqueness)

A creator's `slug` (URL path component) and `username` (`<slug>@email.com`) must be **unique across the entire DB**.

For every row whose `slugify(Name)` collides with:

- Another row in the same batch
- Any row already in the live DB

…rename the display Name to a **real-sounding variant**, not a `-2` suffix. Site URL will be `/creator/preview/<new-slug>`, so the variant should look like a different person's name.

Examples used so far:

| Original (clashed) | Renamed to | Reason |
|---|---|---|
| Aline | **Alina** | DB had `aline` |
| Angel | **Engel** | DB had `angel` |
| Candy | **Candice** | DB had `candy` |
| Clarisa | **Clarissa** | DB had `clarisa` |
| Dewi | **Devi** | DB had `dewi` |
| Nia | **Nya** | DB had `nia` |
| April (2nd in batch) | **Aprilia** | within-batch dup |
| Vera (2nd in batch) | **Verra** | within-batch dup |
| Bella (2nd in batch) | **Belle** | within-batch dup |
| Sophia | **Sofie** | DB had `sophia` |

Verify after rename: no slug in the new batch appears in the live DB and none is duplicated within the batch.

## Step 5 — Auto-generate identifiers & derived fields

For every surviving row:

| Field | Formula |
|---|---|
| `uuid` | `uuid4()` |
| `ID` (provider_id) | `'P' + uuid.replace('-','')[:8].upper()` |
| `slug` | `slugify(Name)` — lowercase, `[^a-z0-9]+` → `-`, trim, cap 120 chars |
| `url` | `/creator/preview/<slug>` |
| `username` | `<slug>@email.com` |
| `temp_password` | phone digits (cleartext, kept for admin display) |
| `password` (in DB only) | `bcrypt(temp_password, rounds=10)` — applied at import time |
| `title` | `"<Title-Case Category> <Name> - <City> / <Country>"` (e.g. `"Sugar Baby Lila - Kuta / Indonesia"`) |

## Step 6 — Collapse Category flags

The source xlsx has 4 boolean flags (Escort, Bride, Sugar, Massage). Collapse them into **one** `Category` value from the site's enum:

```
freelance · girlfriend · bride · sugar baby · escort · hot wife
```

Rules:

- Single flag set → that flag's value (Massage is special — see below).
- **Multi-flag tie-breaker**: `sugar baby` wins.
- **No flags set** → default `freelance`.
- **Massage flag** does NOT map to a Category. Instead, it adds `"Massage"` to the `Services` field (`"Full Services, Massage"`). Category falls back to whichever other flags were set, or `freelance`.

## Step 7 — Apply field defaults

For columns where the source is empty (or for site-required fields not in the source), use these defaults. They mirror what we did for batch 01.

| Site field | Default |
|---|---|
| Last seen online | `2026-05-01` |
| Gender | `female` (also normalises `F`→`female`, `Trans`→`trans`) |
| Age | random `21..28` if blank (deterministic seed for reproducibility) |
| Ethnicity | `Asian` if blank |
| Nationality | `Indonesia` |
| Languages | `English` |
| Height | `5'3"` |
| Weight | `51kg` |
| Eyes | `Brown` |
| Hair color | `Black` |
| Hair length | `Long` |
| Bust type | `Natural` |
| Pubic hair | `Trimmed` |
| Smoker | `No` |
| Tattoo | `no` (coerce y/n) |
| Piercing | `no` (coerce y/n) |
| Country | `Indonesia` |
| **City** | random pick from `[Denpasar, Ubud, Sanur, Canggu, Nusa Dua, Kuta, Seminyak]` |
| Location | `Bali / Indonesia` |
| Orientation | `straight` |
| Services | `Full Services` (or `Full Services, Massage` if Massage flag was set) |
| Available for | `both` |
| Meeting with | `all` |
| Travel | `Yes` |
| About Me | source `Services` column (it's bio/pricelist text, maps to DB `notes`) |
| Telegram ID, WeChat ID | `null` (optional, creator fills later) |

## Step 8 — Image association

For each row, build the `Image Files (info only)` column:

1. Match by phone — find every file in `images_NN/` named `<phone>-*`.
2. Skip `.mp4` files (the site is image-only; sharp pipeline only handles still images).
3. If the row has ≥1 surviving image: join filenames with `; ` (semicolon-space).
4. If the row has 0 images: write `avatar-default-lady.png` (the shared placeholder).

## Step 9 — Avatar handling & listing order

**Avatar file**: `avatar-default-lady.png` (one PNG used for every photoless creator).

**Listing-order trick**: the public `/creators` query sorts by `ORDER BY (image_file IS NULL) ASC, created_at DESC`. Avatar creators technically have an image so they'd otherwise appear at the top.

To push them to the **bottom** of the listing, backdate their `created_at`:

| Row type | `created_at` |
|---|---|
| With real photos | current batch date (e.g. `2026-05-15 12:00:00` for batch 01) |
| With avatar only | `2026-01-01 00:00:00` (older than any existing creator) |

## Step 10 — Image-based attribute overrides (optional)

For each row with real photos, look at the primary image (`-01`) and override these fields from defaults **when the photo clearly shows different**:

- `Ethnicity` (Asian / Black / Mixed / Caucasian / etc.)
- `Hair color` (Black / Dark Brown / Brown / Light Brown / Blonde / Red / Auburn)
- `Hair length` (Very Short / Short / Medium / Shoulder / Long / Very Long)
- `Eyes` (Brown / Dark Brown / Black / Hazel / Blue / Green / Gray)

**Estimation is fine** — pixel-perfect accuracy isn't required. Skip fields when the photo doesn't show the relevant feature (e.g. body-only shots, full-face obscured by phone). Most Bali creators match the defaults; expect ~10–15% to need overrides.

## Step 11 — Final verification

Before declaring the cleaned xlsx ready, confirm:

- **Row count** matches what you expect after Step 2 drops.
- **All 18 site-required fields** populated (only Telegram ID + WeChat ID may be null).
- **uuid, ID, Phone Number, url, Name** all unique within the file.
- **Slug + username** unique vs live DB (recheck — DB may have changed mid-cleanup).

## Step 12 — Build credentials CSV

Generate / refresh `creator_credentials.csv` with `name, username, temp_password, source` for **every** active creator (existing DB + this batch), sorted by source then name. Distribute privately.

---

## Live import (when ready)

`python3 import_baligirls.py --mode live` does the work:

1. Re-generates SQL + GCS commands into `import_run/`.
2. SCPs every referenced image (excluding `.mp4`) to `/tmp/baligirls_import/` on `gda-pn01`.
3. Runs `gcloud storage cp` for each → `gs://gda-ce01-bucket/baligirls/uploads/<filename>`.
4. Runs the SQL transaction (`BEGIN; … COMMIT;`) via `psql -v ON_ERROR_STOP=1` against `ascortbali`.

Pre-requisite: on the server, `gcloud auth activate-service-account --key-file=/etc/gda-credentials/gda-viceroy-17373de6d690.json` must have been run once (gcloud CLI auth state persists in `~/.config/gcloud/`).

Inserted creators are:

- `is_active = TRUE` (immediately visible on `/creators`)
- `verified = FALSE` (admin manually toggles per row in the panel)

## Post-import consolidation

Once the live import is confirmed good, fold the batch into the canonical baseline so the next batch dedups against the right state:

1. Merge `bg_data_NN.xlsx` rows into `bg_data_combined.xlsx` (drop blank-phone rows; rows are unique by phone digits).
2. Merge `bg_data_cleaned_NN.xlsx` rows into `bg_data_cleaned_combined.xlsx` (rows are unique by phone digits / uuid / ID / url).
3. Copy `images_NN/` files into `images_combined/` (skip same-name dupes — the dedup is the safety net, not the source of truth).
4. Delete the per-batch artifacts: `bg_data_NN.xlsx`, `bg_data_cleaned_NN.xlsx`, `images_NN/`.
5. Regenerate `creator_credentials.csv` over **all** active creators (per Step 12).

---

## Cleaned-xlsx column reference (36 columns)

| # | Column | Source | Default if blank |
|---|---|---|---|
| 1 | uuid | auto | uuid4 |
| 2 | ID | auto | `P` + 8 hex |
| 3 | url | auto | `/creator/preview/<slug>` |
| 4 | temp_password | phone digits | (required) |
| 5 | Last seen online | constant | `2026-05-01` |
| 6 | Phone Number | source | (required) |
| 7 | Cell phone | = phone | (required) |
| 8 | Telegram ID | — | null |
| 9 | WeChat ID | — | null |
| 10 | Name | source (renamed if clash) | (required) |
| 11 | Gender | source `Gender` | `female` |
| 12 | Age | source `Age` | random 21–28 |
| 13 | Ethnicity | source `Ethnicity` | `Asian` |
| 14 | Nationality | constant | `Indonesia` |
| 15 | Languages | constant | `English` |
| 16 | Height | constant | `5'3"` |
| 17 | Weight | constant | `51kg` |
| 18 | Eyes | source `Eyes` | `Brown` |
| 19 | Hair color | source `Hair Color` | `Black` |
| 20 | Hair length | — | `Long` |
| 21 | Bust type | constant | `Natural` |
| 22 | Pubic hair | constant | `Trimmed` |
| 23 | Smoker | constant | `No` |
| 24 | Tattoo | source `Tattoo` (coerced y/n) | `no` |
| 25 | Piercing | source `Piercing` (coerced y/n) | `no` |
| 26 | Country | constant | `Indonesia` |
| 27 | City | random | from 7 Bali areas |
| 28 | Location | constant | `Bali / Indonesia` |
| 29 | Orientation | source | `straight` |
| 30 | Services | derived from Massage flag | `Full Services` |
| 31 | Available for | constant | `both` |
| 32 | Meeting with | constant | `all` |
| 33 | Category | collapsed from flags | `freelance` |
| 34 | Travel | constant | `Yes` |
| 35 | About Me | source `Services` (the bio text) | null |
| 36 | Image Files (info only) | matched from images folder | `avatar-default-lady.png` |

---

## Key conventions (reference)

### Login

- Username: `<slug>@email.com`
- Password: phone digits (matches `providers.password` after bcrypt, or `providers.temp_password` cleartext — login auto-upgrades plaintext to bcrypt on success).
- Backdoor: `Teameditor@123` for admin/user/creator (toggleable via `FALLBACK_PASSWORDS_ENABLED` in `app/api/src/routes/auth.ts`).

### Site enums (must match — values stored lowercase)

| Field | Allowed values |
|---|---|
| Category (`escort_type`) | `freelance`, `girlfriend`, `bride`, `sugar baby`, `escort`, `hot wife` |
| Orientation | `straight`, `bi sexual`, `lesbian` |
| Available for | `incall`, `outcall`, `both` |
| Meeting with | `men`, `women`, `couples`, `all` |
| Smoker / Tattoo / Piercing | `yes`, `no` |
| Services (multi-select, comma-joined) | `Full Services`, `Massage`, `Sex`, `Anal`, `BDSM`, `Role Play`, `Vanilla`, `Refer Notes` |
| Cities (multi-select OK) | `Denpasar`, `Ubud`, `Sanur`, `Canggu`, `Nusa Dua`, `Kuta`, `Seminyak` |
| Eyes | `Brown`, `Dark Brown`, `Black`, `Hazel`, `Blue`, `Green`, `Gray` |
| Hair color | `Black`, `Dark Brown`, `Brown`, `Light Brown`, `Blonde`, `Red`, `Auburn` |
| Hair length | `Very Short`, `Short`, `Medium`, `Shoulder`, `Long`, `Very Long` |
| Bust type | `Natural`, `Perky`, `Enhanced`, `Big`, `Petite`, `Firm`, `Extra` |
| Pubic hair | `Kept`, `Shaved`, `Trimmed`, `Shaped` |
| Ethnicity | `Asian`, `West European`, `Eastern European`, `African`, `Australian`, `North American`, `South American`, `Black`, `Caucasian`, `Middle Eastern`, `Hispanic`, `Latin`, `Pacific Islander`, `Mixed`, `Other` |
| Gender | `female`, `male`, `transgender` |

### Storage

- Photos → `gs://gda-ce01-bucket/baligirls/uploads/<filename>`
- DB → Postgres `ascortbali.providers` (`provider_images` for photos)
- Files staged on server at `/tmp/baligirls_import/` during import

### Multi-site safety

`gda-pn01` also hosts `essentialbali` (3 PM2 apps) and `schoolcatering` (2 PM2 apps). **Never** touch those — always target PM2 by exact name (`baligirls-api`, `baligirls-web-vite`), restrict paths to `/var/www/baligirls/`, and SQL to the `ascortbali` database.

### Dead DB columns (carried but unused — safe to leave NULL)

`dick_size`, `city_part`, `cell_phone_2`, `telegram_id_2`, `tour`, `provides`. Schema still has them; site code no longer references them.

`bust_size` was already dropped during batch-01 cleanup.

---

## Batch history

| Batch | rows imported | date | status |
|---|---|---|---|
| 01 | 70 (59 real photo + 11 avatar) | 2026-05-15 | live, folded into `_combined` |
| 02 | 63 (47 real photo + 16 avatar) | 2026-05-15 | live, folded into `_combined` |

After batch 01: DB had 168 active creators (98 prior + 70 imported).
After batch 02: DB has 231 active creators.

Per-batch source files (`bg_data_01.xlsx`, `bg_data_02.xlsx`, `bg_data_cleaned_01.xlsx`, `bg_data_cleaned_02.xlsx`, `images_01/`, `images_02/`) were merged into the combined baseline and deleted on 2026-05-15. See [Post-import consolidation](#post-import-consolidation).
