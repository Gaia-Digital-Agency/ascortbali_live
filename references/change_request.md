# Baligirls — Change Request Log

Living log of change requests, grouped by date. Each section captures the work landed on or around that date. Companion file: [change_request_070526.md](change_request_070526.md) (snapshot punch list from 2026-05-07).

---

## 28th April

### Initial / setup

1. Fixed creator image upload (GCS service-account key wired in)
2. Initial commit + push → `Gaia-Digital-Agency/ascortbali_live`
3. Rewrote README to reflect ce01 → pn01 migration
4. Second commit + push (SEO + README)

### Cosmetic / UI

5. New brand logo + multi-size favicon
6. Resized header logo (32 px → 56 px, retina source 256×256)
7. Reworked button hover states (no clipping); global gold chevron on every dropdown; creator card name strip centred
8. Two stacked side ads per side (`home-1`+`home-2` left, `home-3`+`home-4` right)
9. Removed top pagination on homepage
10. Drop borders on homepage section wrappers so cards/ads fill edge-to-edge
11. Top-align `FeaturedCarousel` cards with leaderboard ad row
12. Verify horizontal gaps between cards are consistent at every breakpoint
13. Remove **FEATURED GIRLS** label from homepage
14. Add floating sticky **BACK TO TOP** button (appears after ~600 px scroll, fixed bottom-right)
15. Unblurred **IMAGE GALLERY** for guests
16. Fixed Services-row layout (label/text overlap)
17. Change creator preview page header **PROFILE** → **CREATOR**
18. Remove **FEATURE IMAGE** label + the `rounded-3xl` border around it
19. Remove **IMAGE GALLERY** label + the section's outer border
20. Rename Services row label on public profile → **ABOUT ME**
21. Lightbox popup: drop viewport padding, image fills `95vh × 95vw`, minimal inner card padding
22. Default Service Area = **All Bali** for any creator save where current value is empty
23. Fix `AdSlot` alt text — use sponsor host instead of `"Ad"`
24. Fix `Ad4Card` alt text — drop literal `"Ad 4"`
25. Fix lightbox `<img>` alt — use creator name
26. Fix gallery thumb alt — `` `${name} photo ${index+1}` ``
27. Fix creator-image-slot editor alt — `` `Creator photo, slot ${slot}` ``

### Image cleanup

28. Build contact sheet of all ~98 creator feature images
29. User identifies images 1 + 3 from the contact sheet
30. Delete **DILA** feature image (DB row + GCS object + nginx cache bust)
31. Delete image 1 (DB row + GCS object + cache bust)
32. Delete image 3 (DB row + GCS object + cache bust)

### Registration / Profile fields

33. Restricted gender to **Female / Transgender** on registration
34. Restricted gender to **Female / Transgender** on editor
35. Removed **HAIR LENGTH** + **SERVICES** from registration entirely
36. Editor: `NOTES` → `ABOUT ME`; `CITY` → `SERVICE AREA` (multi-select); `COUNTRY` removed
37. Added **WeChat ID** field — DB + register + profile editor + public view
38. Split **DETAILS** into profile + contact zones; contacts gated for guests with **MEMBERS ONLY** overlay

### Auth / sessions

39. Fixed 2FA Twilio popup loop (env-parser bug — `z.coerce.boolean()` flipping `"false"` to `true`)
40. Set `JWT_ACCESS_TTL_SECONDS=86400` in `app/api/.env`
41. Remove `signRefreshToken` + `verify-refresh` helpers from `jwt.ts`
42. `POST /auth/login` returns `{ accessToken }` only
43. `POST /auth/2fa/verify` returns `{ accessToken }` only
44. `/auth/refresh` endpoint → `410 Gone` (or removed)
45. Register handlers (`/auth/register`, `/auth/register/creator`) return access-only
46. Frontend `api.ts` — drop refresh logic; `setTokens` / `clearTokens` access-only
47. On `401`, frontend clears token and redirects to portal-appropriate login (no refresh attempt)
48. Update `LoginForm`, `CreatorRegisterPage`, `UserRegisterPage` to drop `refreshToken` from `setTokens`

### Filters

49. Add **Gender** filter to homepage
50. Add **Service Area** filter to homepage

---

## 7th May

### Filters (continued)

1. Add **Category** filter to homepage
2. Extend API `/creators` query with new `gender` / `serviceArea` / `category` params
3. Extend `/creators/filter-options` to return option lists for new filters
4. Update `CreatorFilterControls` with new `<select>`s
5. Persist filter selections in URL query string

### SEO — slugs, meta, indexability

6. URL audit of all routes + external links (200 OK check)
7. Site audit follow-ups (4 unreachable / redirect anomalies, multi-DB rows logged)
8. Fixed `sitemap.xml` + `robots.txt` + `index.html` canonical/og — old `gaiada.online` → live `gaiada2.online`
9. Add `slug varchar(120) UNIQUE` to `providers`; backfill from `model_name` (lowercased, hyphenated, dedup with `-2`/`-3` on collision)
10. Slug generation on creator create / first save (regenerates on rename)
11. `GET /creators/:id` accepts both UUID and slug
12. List response includes `slug`
13. Rename React Router param: `/creator/preview/:slug`
14. Update link call sites in `AdvertisingSpaces.tsx`, `HomePage.tsx`, `CreatorPreviewPage.tsx`
15. Sitemap emits slug URLs instead of UUIDs
16. Add `react-helmet-async`; wrap `App` in `<HelmetProvider>`
17. Add `<Helmet>` to home page (title, description, og:*, canonical)
18. Add `<Helmet>` to creator preview (`` `${name} — Bali Girls` ``, notes excerpt, `og:image` = primary photo)
19. Add `<Helmet>` to blog index, blog detail, terms, privacy, login, register pages
20. Server-side substitute meta tags in `server.ts` SPA-fallback handler (so bots see correct head on initial HTML)
21. Add JSON-LD `Organization` schema on `/`
22. Add JSON-LD `Person` schema on creator preview
23. Add JSON-LD `BlogPosting` schema on blog detail (deferred with Blog feature)
24. Return real `404` status when creator slug or blog slug doesn't resolve (instead of SPA `200`)
25. Audit: no `noindex` meta tag anywhere; no `X-Robots-Tag: noindex` from nginx/Express
26. Verify `robots.txt` still allows all public pages, only blocks `/admin*`, `/user/logged`, `/creator/logged`, `/api/`
27. Sitemap completeness sweep — every public URL listed
28. Canonical hygiene — single canonical host, http→https in place, www behaviour decided

### Phone/WhatsApp + Form tag

29. SQL backfill: tag 16 creators in dup-phone groups as `escort_type='escort'`
30. SQL backfill: tag remaining 84 creators as `escort_type='freelance'`
31. Add `form: enum("freelance","escort")` to `CreatorRegisterSchema` + `CreatorProfileSchema`
32. Persist `form` to `escort_type` column on register + profile save
33. `GET /creators/:id` returns `escort_type` to public
34. Add **FORM** dropdown on registration page
35. Add **FORM** dropdown on profile editor
36. Show **FORM** row on public creator preview (top of profile zone, capitalised)
37. Empty-fill rule: on save, if Phone/SMS empty copy from WhatsApp (and vice-versa)

### Mobile / PageSpeed

38. Lighthouse mobile audit on `/`, `/creator/preview/<slug>`, `/blog` — capture LCP / CLS / TBT
39. Show hero portrait ads (`home-1..4`) on mobile (horizontal-scroll row implemented)
40. Verify all `<img>` have explicit `width` / `height` + `srcset`
41. Defer non-critical CSS
42. More aggressive admin chunk splitting
43. Mobile `FeaturedCarousel`: 2×2 grid → single horizontal snap-scroll carousel (commit `f3ee55c`)
44. Re-audit and document delta vs. baseline

### Blog feature — PENDING

45. Add `Blog` Prisma model (`id`, `slug`, `title`, `excerpt`, `body`, `heroImage`, `publishedAt`, timestamps)
46. `prisma migrate dev --name add_blog`
47. New API route file `app/api/src/routes/blogs.ts`
48. `GET /blogs?page&limit` (public, paginated)
49. `GET /blogs/:slug` (public)
50. `GET /admin/blogs` (admin, includes drafts)
51. `POST /admin/blogs` (admin)
52. `PUT /admin/blogs/:id` (admin)
53. Seed 4 Lorem Ipsum blogs in `app/api/prisma/seed.ts`
54. `DELETE /admin/blogs/:id` (admin)
55. Slug generation from title with `-2`/`-3` collision suffix
56. New page `BlogIndexPage.tsx` — `/blog`, 2-col × 5-row grid, 10 per page, paginated
57. New page `BlogDetailPage.tsx` — `/blog/:slug`, title + hero + markdown body
58. Add `react-markdown` for rendering
59. Lazy-load both blog routes in `App.tsx`
60. Add **BLOG** link in header nav (`Layout.tsx`) between logo and `<AuthNavButton />`
61. Add **BLOG** link in footer (`FooterStatus.tsx`) beside "Creator Zone"
62. Sitemap includes `/blog/<slug>` for every published blog
63. Refactor `AdminLoggedPage.tsx` into `<AdminLayout>` shell + sub-routes
64. New sub-route `/admin/logged/ads` (Ads Management)
65. New sub-route `/admin/logged/creators` (Creator Management)
66. New sub-route `/admin/logged/users` (User Management)
67. New sub-route `/admin/logged/blogs` (Blog Management) — list / create / edit / delete
68. Admin role check in `<AdminLayout>` (single check, then `<Outlet />`)
69. Admin tabs / sidebar nav for switching between sub-pages
70. Hero-image upload for blogs via existing `/api/upload?folder=blogs`

---

## 12th May

### Ads — slot expansion

1. New homepage ad slots `home-9..home-12` (Top Creator Card Area, narrow viewports)
2. New creator-page ad slots `home-13..home-20` (side rails + Top Creator Card Area)
3. DB constraint expanded to permit all 20 home-slots
4. All 20 slots wired into `/api/ads`, admin endpoints, `seed.ts`, and the admin editor
5. Admin Ads-Mgmt grouped by **HOMEPAGE** / **CREATOR PAGE** with three explicit rows per page
6. Format label tag (**LANDSCAPE** / **PORTRAIT** / **CARD**) per slot
7. Placement description on every slot card
8. Slot order reflows: leaderboards → side rails → card-area
9. Ad images served raw at original quality (no `clean-image` proxy, no WebP/AVIF)

### Homepage layout

10. Homepage now shows **18 creators + 2 in-grid ads** per page (was 25 creators)
11. 8-card ad pool cycles uniquely across pages 1–4, then repeats. In-grid ads are never adjacent and never duplicate within a page
12. Above-grid `HomeFirstRowAds` and `CreatorFirstRowAds` blocks dropped
13. Ad cards size to the uploaded image (no crop) for card-type slots
14. Side ads switched from sticky to scroll-progress parallax — bottom aligns with bottom leaderboard at full scroll

### Profile fields

15. **CATEGORY** extended: `freelance` / `girlfriend` / `sugar baby` / `escort` / `hot wife`
16. **ORIENTATION** added to registration + profile: `straight` / `bi sexual` / `lesbian`
17. **LOCATION** dropdown: `Denpasar` / `Ubud` / `Sanur` / `Canggu` / `Nusa Dua`
18. Services multi-checkbox added to the registration form
19. DB backfill: 22 creators `bisexual` → `bi sexual`; 100 creators `city='Bali'` → `'Denpasar'`
20. Public creator preview shows **Category** / **Orientation** / **Location** / **Services** with title-case rendering

### Header / admin

21. Header subtitle split from homepage tagline — two independent admin fields
22. DB backfill seeded `subtitle = tagline` so existing deploys didn't go blank
23. Mobile age-gate flash + fails-to-close race condition fixed
24. Admin Ads-Mgmt gold-border bug fixed (`home-9..12` falsely "unsaved" on first load)
25. Admin upload error surfacing inline + `type="button"` defensive fix

---

## 18th May

### Tooling / data

1. Watermark cleanup tool: fixed install on headless server, added a simple CLI wrapper, cleaned 3 images
2. Uploaded 2 cleaned images to creator profile

### Registration / Login UX

3. User registration: nationality dropdown → 235-name autocomplete; City stays required
4. Header: merged separate **LOGIN** and **REGISTER** buttons into one **LOGIN/REGISTER** entry
5. Login errors: unknown email → routes to registration with email pre-filled; wrong password → opens forgot-password popup automatically
6. New page `/creator/initial-login` — first-time login by temp password only, capped at 3 uses

### DEMS / Category

7. Category became **multi-select** (Dating / Escort / Massage / Sugar Babies); stored as comma-separated values
8. **DEMS** badges added under each creator name on the homepage; D-E-M-S letters light up gold for matching categories
9. Renamed `"dating/brides"` → `"dating"` across the codebase and DB (30 rows migrated)
13. DEMS rebalanced multiple times to give D=41, E=153, M=27, S=33

### Voting → Ratings replacement

10. Voting feature removed (was: anonymous body/face voting); `/api/votes` endpoint deleted
11. Replaced voting with **Body** and **Face** A–F dropdowns in admin `/admin/logged/creators`, left of **Verified**
12. Imported the Bali Girls Database CSV: 133 of 230 creators got Body/Face ratings and categories from the file
14. 97 unrated creators given Body and Face B–E ratings for balance

### Data hygiene

15. Renamed two bad creator names ("Bismillahirrahmanirrahim" → Maharani, "L" → Anggita)

### Card layout

16. Card aspect ratio changed to **9:16**; text strips equalised so ad and creator cards line up
17. Ad cards now always show the bottom text strip, even when empty, so heights match
24. Featured girls carousel: thin gold border added to the 4 hero cards

### Rebranding — "Creator" → "Girls"

18. Renamed "Creator" → "Girls" everywhere user-visible (footer, headings, buttons, toasts, admin labels)
19. Footer "Creator Zone" → "Girls Zone"

### Header / nav

20. Header redesign: gold divider became vertical; added **MENU 1/2/3** placeholder buttons; burger menu for screens below 1024 px
21. Burger icon swapped from Unicode glyph to SVG so it sits properly centred

### Build / deploy fixes

22. Recovered an orphaned Prisma migration that `.gitignore` was silently dropping
23. Discovered the other chat's changes had source on prod but weren't built — built + deployed them with everything else

### Ads

25. In-grid ad description: admin can now type a 50-char description per ad slot; renders as a name-strip on the ad card mirroring creator card
