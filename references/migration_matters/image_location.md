# Image Locations (Grouped By VM Path)

Generated: 2026-02-08 17:32:55

## GCP Locations (From `gcp_move/*` notes)

- Project: `gda-viceroy`
- VM: `gda-s01` (public IP `34.124.244.233`)
- Deployed repo path on VM: `/var/www/baligirls`
- App base path (NGINX mount): `/baligirls`
- Cloud SQL instance: `baligirls` (database `ascortbali`)
- Cloud Storage bucket for uploads: `gs://gda-ce01-bucket/baligirls/uploads/...`

Notes:
- Below are repo-tracked images (Assets/Public/backups). They live on the VM filesystem when the repo is synced.
- User uploads live in GCS under `baligirls/uploads` and are served via `/baligirls/api/uploads/<object-key>`.
- Homepage ad images are stored in `gs://gda-ce01-bucket/baligirls/ads/` and referenced from `advertising_spaces.image`.

## VM Paths

### `/var/www/baligirls`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/baligirls_logo02.png` | `baligirls_logo02.png` | `` | Not stored in Cloud SQL. |  |

### `/var/www/baligirls/app/Assets/Admin`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/app/Assets/Admin/baligirls_logo.png` | `app/Assets/Admin/baligirls_logo.png` | `/baligirls/api/admin-asset/baligirls_logo.png` | Postgres: `advertising_spaces.image` (seeded to `/api/admin-asset/baligirls_logo.png`). | ./gcp_move/phase02_move.md:140<br>./app/web/app/layout.tsx:25<br>app/web/app/api/admin-asset/[filename]/route.ts |
| `/var/www/baligirls/app/Assets/Admin/humapedia.png` | `app/Assets/Admin/humapedia.png` | `/baligirls/api/admin-asset/humapedia.png` | Postgres: `advertising_spaces.image` (seeded to `/api/admin-asset/humapedia.png`). | ./database/seed.py:259<br>./app/web/components/AdvertisingSpaces.tsx:21<br>./app/web/app/admin/logged/page.tsx:18<br>app/web/app/api/admin-asset/[filename]/route.ts |
| `/var/www/baligirls/app/Assets/Admin/unique.png` | `app/Assets/Admin/unique.png` | `/baligirls/api/admin-asset/unique.png` | Postgres: `advertising_spaces.image` (seeded to `/api/admin-asset/unique.png`). | ./database/seed.py:258<br>./app/web/app/admin/logged/page.tsx:17<br>./app/web/components/AdvertisingSpaces.tsx:20<br>app/web/app/api/admin-asset/[filename]/route.ts |

### `/var/www/baligirls/app/Assets/Creator/clean_image`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_01.jpg` | `app/Assets/Creator/clean_image/IM_835389_01.jpg` | `/baligirls/api/clean-image/IM_835389_01.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./gcp_move/phase02_move.md:141<br>./app/data/image_data.json:4 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_02.jpg` | `app/Assets/Creator/clean_image/IM_835389_02.jpg` | `/baligirls/api/clean-image/IM_835389_02.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:10 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_03.jpg` | `app/Assets/Creator/clean_image/IM_835389_03.jpg` | `/baligirls/api/clean-image/IM_835389_03.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:16 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_04.jpg` | `app/Assets/Creator/clean_image/IM_835389_04.jpg` | `/baligirls/api/clean-image/IM_835389_04.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:22 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_05.jpg` | `app/Assets/Creator/clean_image/IM_835389_05.jpg` | `/baligirls/api/clean-image/IM_835389_05.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:28 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_06.jpg` | `app/Assets/Creator/clean_image/IM_835389_06.jpg` | `/baligirls/api/clean-image/IM_835389_06.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:34 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_07.jpg` | `app/Assets/Creator/clean_image/IM_835389_07.jpg` | `/baligirls/api/clean-image/IM_835389_07.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:40 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_08.jpg` | `app/Assets/Creator/clean_image/IM_835389_08.jpg` | `/baligirls/api/clean-image/IM_835389_08.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:46 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_09.jpg` | `app/Assets/Creator/clean_image/IM_835389_09.jpg` | `/baligirls/api/clean-image/IM_835389_09.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:52 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_10.jpg` | `app/Assets/Creator/clean_image/IM_835389_10.jpg` | `/baligirls/api/clean-image/IM_835389_10.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:58 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_11.jpg` | `app/Assets/Creator/clean_image/IM_835389_11.jpg` | `/baligirls/api/clean-image/IM_835389_11.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:64 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_12.jpg` | `app/Assets/Creator/clean_image/IM_835389_12.jpg` | `/baligirls/api/clean-image/IM_835389_12.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:70 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_13.jpg` | `app/Assets/Creator/clean_image/IM_835389_13.jpg` | `/baligirls/api/clean-image/IM_835389_13.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:76 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_14.jpg` | `app/Assets/Creator/clean_image/IM_835389_14.jpg` | `/baligirls/api/clean-image/IM_835389_14.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:82 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_15.jpg` | `app/Assets/Creator/clean_image/IM_835389_15.jpg` | `/baligirls/api/clean-image/IM_835389_15.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:88 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_16.jpg` | `app/Assets/Creator/clean_image/IM_835389_16.jpg` | `/baligirls/api/clean-image/IM_835389_16.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:94 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_17.jpg` | `app/Assets/Creator/clean_image/IM_835389_17.jpg` | `/baligirls/api/clean-image/IM_835389_17.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:100 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_18.jpg` | `app/Assets/Creator/clean_image/IM_835389_18.jpg` | `/baligirls/api/clean-image/IM_835389_18.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:106 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_19.jpg` | `app/Assets/Creator/clean_image/IM_835389_19.jpg` | `/baligirls/api/clean-image/IM_835389_19.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:112 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_20.jpg` | `app/Assets/Creator/clean_image/IM_835389_20.jpg` | `/baligirls/api/clean-image/IM_835389_20.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:118 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_835389_21.jpg` | `app/Assets/Creator/clean_image/IM_835389_21.jpg` | `/baligirls/api/clean-image/IM_835389_21.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:124 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_01.jpg` | `app/Assets/Creator/clean_image/IM_842989_01.jpg` | `/baligirls/api/clean-image/IM_842989_01.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:130 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_02.jpg` | `app/Assets/Creator/clean_image/IM_842989_02.jpg` | `/baligirls/api/clean-image/IM_842989_02.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:136 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_03.jpg` | `app/Assets/Creator/clean_image/IM_842989_03.jpg` | `/baligirls/api/clean-image/IM_842989_03.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:142 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_04.jpg` | `app/Assets/Creator/clean_image/IM_842989_04.jpg` | `/baligirls/api/clean-image/IM_842989_04.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:148 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_05.jpg` | `app/Assets/Creator/clean_image/IM_842989_05.jpg` | `/baligirls/api/clean-image/IM_842989_05.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:154 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_06.jpg` | `app/Assets/Creator/clean_image/IM_842989_06.jpg` | `/baligirls/api/clean-image/IM_842989_06.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:160 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_07.jpg` | `app/Assets/Creator/clean_image/IM_842989_07.jpg` | `/baligirls/api/clean-image/IM_842989_07.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:166 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_08.jpg` | `app/Assets/Creator/clean_image/IM_842989_08.jpg` | `/baligirls/api/clean-image/IM_842989_08.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:172 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_09.jpg` | `app/Assets/Creator/clean_image/IM_842989_09.jpg` | `/baligirls/api/clean-image/IM_842989_09.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:178 |
| `/var/www/baligirls/app/Assets/Creator/clean_image/IM_842989_10.jpg` | `app/Assets/Creator/clean_image/IM_842989_10.jpg` | `/baligirls/api/clean-image/IM_842989_10.jpg` | Postgres: `provider_images.image_file` (source path/URL; UI maps basename to `/api/clean-image/<filename>`). | app/web/app/api/clean-image/[filename]/route.ts<br>app/web/app/page.tsx<br>app/web/app/creator/logged/page.tsx<br>app/web/app/creator/preview/[id]/page.tsx<br>./app/data/image_data.json:184 |

### `/var/www/baligirls/app/web/public`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/app/web/public/logo/logo.png` | `app/web/public/logo/logo.png` | `/baligirls/logo/logo.png` | Typically not stored in Cloud SQL (referenced directly by path in frontend). | ./gcp_move/phase02_move.md:140<br>./app/web/app/layout.tsx:25 |

### `/var/www/baligirls/app/web/public/ads`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/app/web/public/ads/baligirls_logo.png` | `app/web/public/ads/baligirls_logo.png` | `/baligirls/ads/baligirls_logo.png` | Typically not stored in Cloud SQL (referenced directly by path in frontend). | ./gcp_move/phase02_move.md:140<br>./app/web/app/layout.tsx:25 |
| `/var/www/baligirls/app/web/public/ads/humapedia.png` | `app/web/public/ads/humapedia.png` | `/baligirls/ads/humapedia.png` | Typically not stored in Cloud SQL (referenced directly by path in frontend). | ./database/seed.py:259<br>./app/web/components/AdvertisingSpaces.tsx:21<br>./app/web/app/admin/logged/page.tsx:18 |
| `/var/www/baligirls/app/web/public/ads/unique.png` | `app/web/public/ads/unique.png` | `/baligirls/ads/unique.png` | Typically not stored in Cloud SQL (referenced directly by path in frontend). | ./database/seed.py:258<br>./app/web/components/AdvertisingSpaces.tsx:20<br>./app/web/app/admin/logged/page.tsx:17 |

### `/var/www/baligirls/app/web/public/placeholders`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/app/web/public/placeholders/card-1.jpg` | `app/web/public/placeholders/card-1.jpg` | `/baligirls/placeholders/card-1.jpg` | May be stored as a string path in DB rows (e.g. Prisma seeds `/placeholders/...`). | ./app/web/app/page.tsx:280<br>./app/web/app/creator/preview/[id]/page.tsx:156<br>./app/web/app/creator/preview/[id]/CreatorPreviewClient.tsx:98 |
| `/var/www/baligirls/app/web/public/placeholders/card-2.jpg` | `app/web/public/placeholders/card-2.jpg` | `/baligirls/placeholders/card-2.jpg` | May be stored as a string path in DB rows (e.g. Prisma seeds `/placeholders/...`). | ./app/api/prisma/seed.ts:93<br>./app/web/app/services/[id]/ServiceDetailClient.tsx:42<br>./app/web/app/services/[id]/ServiceDetailClient.tsx:45 |
| `/var/www/baligirls/app/web/public/placeholders/card-3.jpg` | `app/web/public/placeholders/card-3.jpg` | `/baligirls/placeholders/card-3.jpg` | May be stored as a string path in DB rows (e.g. Prisma seeds `/placeholders/...`). | ./app/api/prisma/seed.ts:101<br>./app/web/app/services/[id]/ServiceDetailClient.tsx:43 |
| `/var/www/baligirls/app/web/public/placeholders/hero-1.jpg` | `app/web/public/placeholders/hero-1.jpg` | `/baligirls/placeholders/hero-1.jpg` | May be stored as a string path in DB rows (e.g. Prisma seeds `/placeholders/...`). | ./app/api/prisma/seed.ts:85<br>./app/web/app/services/[id]/ServiceDetailClient.tsx:44<br>./app/web/app/services/[id]/ServiceDetailClient.tsx:62<br>./app/web/app/creator/preview/[id]/page.tsx:150 |
| `/var/www/baligirls/app/web/public/placeholders/section-1.jpg` | `app/web/public/placeholders/section-1.jpg` | `/baligirls/placeholders/section-1.jpg` | May be stored as a string path in DB rows (e.g. Prisma seeds `/placeholders/...`). |  |

### `/var/www/baligirls/gcp_move/logo_backups`

| VM file | Repo file | Served URL (staging) | Cloud SQL pointer | References in repo |
|---|---|---|---|---|
| `/var/www/baligirls/gcp_move/logo_backups/baligirls_logo_assets_prev_20260208T091730Z.png` | `gcp_move/logo_backups/baligirls_logo_assets_prev_20260208T091730Z.png` | `` | Not stored in Cloud SQL. |  |
| `/var/www/baligirls/gcp_move/logo_backups/baligirls_logo_public_prev_20260208T091730Z.png` | `gcp_move/logo_backups/baligirls_logo_public_prev_20260208T091730Z.png` | `` | Not stored in Cloud SQL. |  |

## Useful Queries (Cloud SQL)

```sql
SELECT slot, image, text FROM advertising_spaces ORDER BY slot;

SELECT provider_uuid, image_id, sequence_number, image_file, resolution
FROM provider_images
WHERE resolution = 'clean'
ORDER BY provider_uuid, sequence_number;
```
