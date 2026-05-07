# Baligirls — Change Request 07/05/26

Full task list (119 items). Status as of 2026-05-07.

Legend: `[x]` done · `[ ]` pending

---

## Today — done (1–21)

- [x] 1. URL audit of all routes + external links (200 OK check)
- [x] 2. Fixed creator image upload (GCS service-account key wired in)
- [x] 3. New brand logo + multi-size favicon
- [x] 4. Two stacked side ads per side (home-1+2 left, home-3+4 right)
- [x] 5. Removed top pagination on homepage
- [x] 6. Fixed 2FA Twilio popup loop (env-parser bug — `z.coerce.boolean()` flipping `"false"` to `true`)
- [x] 7. Unblurred IMAGE GALLERY for guests
- [x] 8. Fixed Services-row layout (label/text overlap)
- [x] 9. Added WeChat ID field — DB + register + profile editor + public view
- [x] 10. Split DETAILS into profile + contact zones; contacts gated for guests with MEMBERS ONLY overlay
- [x] 11. Resized header logo (32 px → 56 px, retina source 256×256)
- [x] 12. Reworked button hover states (no clipping); global gold chevron on every dropdown; creator card name strip centered
- [x] 13. Restricted gender to Female / Transgender on registration
- [x] 14. Editor: `NOTES` → `ABOUT ME`; `CITY` → `SERVICE AREA` (multi-select); `COUNTRY` removed
- [x] 15. Restricted gender to Female / Transgender on editor
- [x] 16. Removed `HAIR LENGTH` + `SERVICES` from registration entirely
- [x] 17. Site audit follow-ups (4 unreachable / redirect anomalies, multi-DB rows logged)
- [x] 18. Initial commit + push → `Gaia-Digital-Agency/ascortbali_live`
- [x] 19. Fixed sitemap.xml + robots.txt + index.html canonical/og — old `gaiada.online` → live `gaiada2.online`
- [x] 20. Rewrote README to reflect ce01 → pn01 migration
- [x] 21. Second commit + push (SEO + README)

## Image cleanup (22–26)

- [x] 22. Build contact sheet of all ~98 creator feature images
- [x] 23. User identifies images 1 + 3 from the contact sheet
- [x] 24. Delete DILA feature image (DB row + GCS object + nginx cache bust)
- [x] 25. Delete image 1 (DB row + GCS object + cache bust)
- [x] 26. Delete image 3 (DB row + GCS object + cache bust)

## Cosmetic / UI (27–42)

- [x] 27. Remove `FEATURED GIRLS` label from homepage
- [x] 28. Drop borders on homepage section wrappers so cards/ads fill edge-to-edge
- [x] 29. Top-align FeaturedCarousel cards with leaderboard ad row
- [x] 30. Verify horizontal gaps between cards are consistent at every breakpoint
- [x] 31. Change creator preview page header `PROFILE` → `CREATOR`
- [x] 32. Remove `FEATURE IMAGE` label + the rounded-3xl border around it
- [x] 33. Remove `IMAGE GALLERY` label + the section's outer border
- [x] 34. Rename `Services` row label on public profile → `ABOUT ME`
- [x] 35. Lightbox popup: drop viewport padding, image fills `95vh × 95vw`, minimal inner card padding
- [x] 36. Add floating sticky `BACK TO TOP` button (appears after ~600 px scroll, fixed bottom-right)
- [x] 37. Default `Service Area = All Bali` for any creator save where current value is empty
- [x] 38. Fix `AdSlot` alt text — use sponsor host instead of "Ad <slot>"
- [x] 39. Fix `Ad4Card` alt text — drop literal "Ad 4"
- [x] 40. Fix lightbox `<img>` alt — use creator name
- [x] 41. Fix gallery thumb alt — `${name} photo ${index+1}`
- [x] 42. Fix creator-image-slot editor alt — `Creator photo, slot ${slot}`

## Auth / sessions — 24h, no refresh (43–51)

- [x] 43. Set `JWT_ACCESS_TTL_SECONDS=86400` in `app/api/.env`
- [x] 44. Remove `signRefreshToken` + verify-refresh helpers from `jwt.ts`
- [x] 45. `/auth/login` returns `{ accessToken }` only
- [x] 46. `/auth/2fa/verify` returns `{ accessToken }` only
- [x] 47. `/auth/refresh` endpoint → `410 Gone` (or removed)
- [x] 48. Register handlers (`/auth/register`, `/auth/register/creator`) return access-only
- [x] 49. Frontend `api.ts` — drop refresh logic; `setTokens`/`clearTokens` access-only
- [x] 50. On 401, frontend clears token and redirects to portal-appropriate login (no refresh attempt)
- [x] 51. Update `LoginForm`, `CreatorRegisterPage`, `UserRegisterPage` to drop `refreshToken` from setTokens

## Filters (52–58)

- [x] 52. Add Gender filter to homepage
- [x] 53. Add Service Area filter to homepage
- [x] 54. Add Category filter to homepage
- [x] 55. Extend API `/creators` query with new `gender` / `serviceArea` / `category` params
- [x] 56. Extend `/creators/filter-options` to return option lists for new filters
- [x] 57. Update `CreatorFilterControls` with new `<select>`s
- [x] 58. Persist filter selections in URL query string

## SEO — slugs, meta, indexability (59–78)

- [x] 59. Add `slug varchar(120) UNIQUE` to `providers`; backfill from `model_name` (lowercased, hyphenated, dedup with -2/-3 on collision)
- [x] 60. Slug generation on creator create / first save (regenerates on rename)
- [x] 61. `GET /creators/:id` accepts both UUID and slug
- [x] 62. List response includes `slug`
- [x] 63. Rename React Router param: `/creator/preview/:slug`
- [x] 64. Update link call sites in `AdvertisingSpaces.tsx`, `HomePage.tsx`, `CreatorPreviewPage.tsx`
- [x] 65. Sitemap emits slug URLs instead of UUIDs
- [x] 66. Add `react-helmet-async`; wrap App in `<HelmetProvider>`
- [x] 67. Add `<Helmet>` to home page (title, description, og:*, canonical)
- [x] 68. Add `<Helmet>` to creator preview (`${name} — Bali Girls`, notes excerpt, og:image = primary photo)
- [x] 69. Add `<Helmet>` to blog index, blog detail, terms, privacy, login, register pages
- [x] 70. Server-side substitute meta tags in `server.ts` SPA-fallback handler (so bots see correct head on initial HTML)
- [x] 71. Add JSON-LD `Organization` schema on `/`
- [x] 72. Add JSON-LD `Person` schema on creator preview
- [ ] 73. Add JSON-LD `BlogPosting` schema on blog detail _(deferred with Blog feature)_
- [x] 74. Return real **404 status** when creator slug or blog slug doesn't resolve (instead of SPA 200)
- [x] 75. Audit: no `noindex` meta tag anywhere; no `X-Robots-Tag: noindex` from nginx/Express
- [x] 76. Verify robots.txt still allows all public pages, only blocks `/admin*`, `/user/logged`, `/creator/logged`, `/api/`
- [x] 77. Sitemap completeness sweep — every public URL listed
- [x] 78. Canonical hygiene — single canonical host, http→https in place, www behavior decided

## Phone/WhatsApp + Form tag (79–87)

- [x] 79. SQL backfill: tag 16 creators in dup-phone groups as `escort_type='escort'`
- [x] 80. SQL backfill: tag remaining 84 creators as `escort_type='freelance'`
- [x] 81. Add `form: enum("freelance","escort")` to `CreatorRegisterSchema` + `CreatorProfileSchema`
- [x] 82. Persist `form` to `escort_type` column on register + profile save
- [x] 83. `/creators/:id` returns `escort_type` to public
- [x] 84. Add FORM dropdown on registration page
- [x] 85. Add FORM dropdown on profile editor
- [x] 86. Show FORM row on public creator preview (top of profile zone, capitalised)
- [x] 87. Empty-fill rule: on save, if Phone/SMS empty copy from WhatsApp (and vice-versa)

## Blog feature (88–113) — PENDING

- [ ] 88. Add `Blog` Prisma model (`id`, `slug`, `title`, `excerpt`, `body`, `heroImage`, `publishedAt`, timestamps)
- [ ] 89. `prisma migrate dev --name add_blog`
- [ ] 90. New API route file `app/api/src/routes/blogs.ts`
- [ ] 91. `GET /blogs?page&limit` (public, paginated)
- [ ] 92. `GET /blogs/:slug` (public)
- [ ] 93. `GET /admin/blogs` (admin, includes drafts)
- [ ] 94. `POST /admin/blogs` (admin)
- [ ] 95. `PUT /admin/blogs/:id` (admin)
- [ ] 96. `DELETE /admin/blogs/:id` (admin)
- [ ] 97. Slug generation from title with `-2`/`-3` collision suffix
- [ ] 98. New page `BlogIndexPage.tsx` — `/blog`, 2-col × 5-row grid, 10 per page, paginated
- [ ] 99. New page `BlogDetailPage.tsx` — `/blog/:slug`, title + hero + markdown body
- [ ] 100. Add `react-markdown` for rendering
- [ ] 101. Lazy-load both blog routes in `App.tsx`
- [ ] 102. Add `BLOG` link in header nav (`Layout.tsx`) between logo and `<AuthNavButton />`
- [ ] 103. Add `BLOG` link in footer (`FooterStatus.tsx`) beside "Creator Zone"
- [ ] 104. Sitemap includes `/blog/<slug>` for every published blog
- [ ] 105. Refactor `AdminLoggedPage.tsx` into `<AdminLayout>` shell + sub-routes
- [ ] 106. New sub-route `/admin/logged/ads` (Ads Management)
- [ ] 107. New sub-route `/admin/logged/creators` (Creator Management)
- [ ] 108. New sub-route `/admin/logged/users` (User Management)
- [ ] 109. New sub-route `/admin/logged/blogs` (Blog Management) — list / create / edit / delete
- [ ] 110. Admin role check in `<AdminLayout>` (single check, then `<Outlet />`)
- [ ] 111. Admin tabs / sidebar nav for switching between sub-pages
- [ ] 112. Hero-image upload for blogs via existing `/api/upload?folder=blogs`
- [ ] 113. Seed 4 Lorem Ipsum blogs in `app/api/prisma/seed.ts`

## Mobile / PageSpeed (114–119)

- [x] 114. Lighthouse mobile audit on `/`, `/creator/preview/<slug>`, `/blog` — capture LCP / CLS / TBT
- [x] 115. Show hero portrait ads (`home-1..4`) on mobile (horizontal-scroll row implemented)
- [x] 116. Verify all `<img>` have explicit `width`/`height` + `srcset`
- [x] 117. Defer non-critical CSS
- [x] 118. More aggressive admin chunk splitting
- [x] 119. Re-audit and document delta vs. baseline

---

## Bonus (post-119)

- [x] Mobile FeaturedCarousel: 2×2 grid → single horizontal snap-scroll carousel (commit `f3ee55c`)

---

## Summary

- **Done:** 93 items (1–72, 74–87, 114–119, plus bonus)
- **Pending:** 26 items (73 + 88–113 — all under the Blog feature umbrella)
