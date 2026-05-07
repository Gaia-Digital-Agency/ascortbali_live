# Migration: Images

## Admin

### Upload Flow (Ads Image)

1. Admin opens `/baligirls/admin/logged` and picks an image file for an ad slot.
2. Browser uploads the file to `POST /baligirls/api/upload` (Next.js route).
3. The server stores the file bytes in GCS at `gs://gda-s01-bucket/baligirls/uploads/<object-key>`.
4. The upload endpoint returns a URL like `/baligirls/api/uploads/<object-key>`.
5. The admin page saves that returned URL into Cloud SQL by calling the backend API to update the slot; it ends up in `advertising_spaces.image`.
6. Later, when anyone loads the homepage, the app reads the ad slots from Cloud SQL, gets `advertising_spaces.image`, and renders it.
7. The browser requests `/baligirls/api/uploads/<object-key>`, and the server streams the image from GCS back to the browser.

### For A Full Migration You Need

- The Cloud SQL PostgreSQL database (so you keep rows like `advertising_spaces.image`, `provider_images.image_file`, etc.).
- The GCS objects under `gs://gda-s01-bucket/baligirls/uploads/` (so the uploaded image bytes still exist for URLs like `/baligirls/api/uploads/<object-key>`).
- Additionally, if you're moving to a new VM or rebuilding from scratch, also include the repo-tracked static assets that live on the VM filesystem when deployed (for example `app/Assets/**` and `app/web/public/**`).

## Creator

### Upload Flow (Creator Gallery/Slots)

1. Creator opens `/baligirls/creator/logged` and selects an image for a slot/gallery.
2. Browser uploads the file bytes to `POST /baligirls/api/upload` (Next.js route).
3. The server stores the file in GCS at `gs://gda-s01-bucket/baligirls/uploads/<object-key>`.
4. The upload endpoint returns a URL like `/baligirls/api/uploads/<object-key>`.
5. The creator page saves that returned URL into Cloud SQL by calling the backend API (Express) to upsert/update the image record; it ends up in `provider_images.image_file` (and related fields like `sequence_number`).
6. Later, when the creator profile or creator list is loaded, the backend reads `provider_images.image_file` from Cloud SQL and returns it to the web app.
7. The browser requests the stored URL (`/baligirls/api/uploads/<object-key>`), and Next.js streams the image from GCS back to the browser.

### For Creator Uploads (Migration Requirements)

- Cloud SQL PostgreSQL (keeps `provider_images.image_file` and related creator/image rows).
- GCS objects under `gs://gda-s01-bucket/baligirls/uploads/` (the actual uploaded bytes).
- Additionally (creator images that are not uploads): if you rely on the “cleaned image” flow, you also need the VM filesystem assets (or redeploy them) for:
  - `/var/www/baligirls/app/Assets/Creator/clean_image/*` (served by `/baligirls/api/clean-image/<filename>`).

## User

From the user logged-in page itself (the UI at `/baligirls/user/logged`): No. There is no upload control and that page never calls `/baligirls/api/upload`.

From a capability/security standpoint: Yes, they still can, because `POST /baligirls/api/upload` currently has no auth/role enforcement. A logged-in user could upload by manually calling the endpoint (same for a non-logged-in visitor) unless you add an auth check or block it at NGINX.
