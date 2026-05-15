# Baligirls — Site Features Inventory

A breakdown of every user-visible and operator-facing feature on the live site, organised by audience and area. Treat this as the canonical "what does the site do" reference for new team members and client conversations.

## 1. Branding & Pages

1. Single-page React (Vite) app served by an Express SSR shim at `baligirls.gaiada2.online`.
2. Brand identity: dark theme with brand-gold accent (`#c9a24d`), serif display font, monospaced micro-labels, brand-line dividers.
3. Editable site **header subtitle** (under "FREE BALI GIRLS") via admin — separate from the homepage tagline.
4. Editable **homepage tagline** (large H2 banner) via admin.
5. Custom multi-size favicon + retina-quality logo (256×256 source, displayed at 56px).
6. Public routes: `/`, `/blog`, `/blog/<slug>`, `/creator/preview/<slug>`, `/terms`, `/privacy`.
7. Account routes: `/user`, `/user/register`, `/creator`, `/creator/register`, `/admin`.
8. Per-route SEO meta + canonical + Open Graph + Twitter card tags, server-rendered into the initial HTML so crawlers see them on the first byte.
9. JSON-LD structured data: `Organization` on the homepage, `Person` on creator preview, `BlogPosting` on blog detail.
10. Dynamic `/sitemap.xml` — auto-includes every published creator slug and blog slug.
11. `robots.txt` permits all public routes, blocks `/admin*`, `/user/logged`, `/creator/logged`, `/api/`.
12. Real `404` HTTP status when a creator slug or blog slug does not resolve (search-engine-friendly).
13. 18+ Age Verification modal on landing pages — accepts and remembers per browser + per IP.
14. Floating "BACK TO TOP" pill that appears after ~600px of scroll.
15. Footer with TERMS, PRIVACY STATEMENT, CREATOR ZONE, BLOG links.
16. Site-wide maintenance mode: nginx returns `503 + Retry-After: 3600` and a brand-styled "Back Shortly" page; operator IP bypasses. Toggled by `touch/rm /var/www/baligirls/maintenance/.on` — no nginx reload, no service restart.
17. Hosted on GCE (`gda-pn01`, asia-southeast1-a) behind nginx + Let's Encrypt; PM2 cluster mode for the API, fork mode for the web tier.
18. Responsive design: mobile breakpoint 2-col, tablet/desktop 4–7 col grids; side ads activate at viewport ≥1392px.

## 2. Advertisements — Features & Locations

1. **21 ad slots** total — 20 home slots + 1 bottom "Your Ads Here" placeholder.
2. **Homepage slots:**
   - `home-5`, `home-6` — landscape leaderboards (top + bottom of the page)
   - `home-1`, `home-2` — portrait side rail, top-left + bottom-left (≥1392px viewport)
   - `home-3`, `home-4` — portrait side rail, top-right + bottom-right (≥1392px viewport)
   - `home-9`, `home-10`, `home-11`, `home-12` — card-style ads inserted into the creator grid
3. **Creator Page slots:**
   - `home-7`, `home-8` — landscape leaderboards (top + bottom)
   - `home-13`, `home-14` — portrait side rail, left top + bottom
   - `home-15`, `home-16` — portrait side rail, right top + bottom
   - `home-17`–`home-20` — card-style ads that, together with `home-9..12`, form the 8-card pool for the homepage in-grid rotation
4. **In-grid ad placement (homepage):** every paginated page of the creator grid renders **18 creators + 2 random ad cards** = 20 cells per page.
5. **No-adjacency rule:** the two in-grid ads are never side-by-side on any row, never duplicate on the same page.
6. **8-card pool cycling:** ads `home-9..12` + `home-17..20` form a pool of 8 unique cards; pages 1–4 consume the pool once, pages 5+ cycle from the start.
7. **Deterministic per-page layout:** ad positions are seeded by page number so the same page always shows the same ad layout (no flicker on re-render).
8. **Side-ad parallax:** side rails drift at scroll-progress-mapped speed — ad top is at the wrapper top on arrival, bottom aligns with the bottom leaderboard at full scroll.
9. **Auto-aspect cards:** in-grid ad cards size to the operator's uploaded image — no fixed aspect, no crop.
10. **Image quality:** ad images are served uncompressed straight from GCS at `/api/uploads/baligirls/ads/<file>` — no Sharp pipeline, no AVIF/WebP conversion, no per-width resizing.
11. **Click-through:** each slot has its own `link_url` field; the ad becomes a `target=_blank` link with `rel=noreferrer noopener` when set.
12. **Empty-slot placeholder:** unfilled slots render a labelled empty card on the public site (clearly visible to the operator).
13. **Alt-text:** each ad image's alt text falls back to the link's host name when nothing better is set.
14. **Single source of truth:** all 21 slots persisted in the Postgres `advertising_spaces` table with a `slot_check` constraint enforcing valid names.
15. **Public API:** `GET /api/ads` returns all 21 slots in a stable, page-grouped order (used by the homepage and Creator Page renderers).
16. **Mobile-only horizontal-strip variant** (`MobileAdsRow`) retained as a back-compat export but no longer rendered by default — its inventory has been replaced by in-grid placement.
17. **No image upload bypass:** uploads must go through the admin UI, which proxies to `POST /api/upload?folder=ads` with the GCS service-account key.

## 3. Unregistered Visitors

1. Homepage browse: 18 creator cards + 2 ads per page, paginated.
2. Six-filter creator search: Nationality / Age band / Height (2-inch range) / Gender / Service Area / Category — URL-persisted, multi-axis.
3. **CLEAR** button on the filters resets the URL params in one tap.
4. Featured Carousel: 4 admin-picked creators displayed at the top of the homepage (2×2 mobile, 4-col desktop).
5. Click any creator card → public creator preview page (`/creator/preview/<slug>`).
6. Creator preview shows: hero image, name, **Category**, age, gender, **Orientation**, available-for, meeting-with, smoker/tattoo/piercing flags, nationality, ethnicity, **Location**, eyes/hair, height/weight, travel, **Services**, About Me.
7. Image gallery (up to 12 photos) — unblurred for guests.
8. Click any gallery image → full-screen **lightbox** that respects the sticky navbar.
9. Contact details (Phone/SMS, WhatsApp, Telegram, WeChat) are **gated** behind a "MEMBERS ONLY" overlay until login/register.
10. "Explore Next Girl" section: 8 random other creators at the bottom of every preview page.
11. Public blog: paginated list at `/blog` (9 cards per page) and full markdown article at `/blog/<slug>`.
12. T&Cs, Privacy Statement, About-style legal copy on dedicated pages.
13. Age Verification gate (18+) on first visit — remembers acceptance per browser and per IP, never re-prompts within the same browser/IP.
14. Footer with quick links to Terms, Privacy, Creator Zone, Blog.
15. Sticky header with BLOG link removed (footer link kept), AGE-VERIFICATION-aware.
16. Site works on mobile, tablet, and desktop — no separate mobile site.
17. SEO-friendly URLs everywhere (slugs, not UUIDs).

## 4. Registered Visitors (Members)

1. Email + password registration at `/user/register` with confirm-password + WhatsApp 2FA option.
2. Login at `/user/login` returns a **24-hour access token** (no refresh — strict re-login after 24h).
3. Logged-in members unlock the **MEMBERS ONLY** contact panel on every creator preview: Phone/SMS, WhatsApp, Telegram, WeChat.
4. Personal profile page at `/user/logged`: edit basic profile data, change password.
5. Auto-redirect to portal-specific login on 401 (no infinite redirect loops, even on the login page itself).
6. WhatsApp 2FA enrollment available (optional; feature-flagged via `WHATSAPP_2FA_ENABLED`).
7. Password reset flow: short-lived JWT (`purpose=password_reset`, 15-min expiry) signed with the same Ed25519 key.
8. Session storage: JWT in `sessionStorage` + `localStorage` (so refresh keeps you signed in for up to 24h).
9. LOGOUT button clears all tokens + redirects to home; analytics-beacon logs the event.
10. Member-only landing page: shows "Signed in as <username>" plus profile controls.
11. Members can revisit any creator preview without the MEMBERS-ONLY overlay popping back.
12. Activity-log tracking (page views, contact-reveal events) feeds the admin analytics.

## 5. Creators

1. Self-serve registration at `/creator/register`: email, password, model name, gender (female / transgender), Category (5 options), age, nationality, **Location** (5 Bali zones), phone, WhatsApp, optional Telegram + WeChat, **Orientation**, **Services** multi-select.
2. Two-factor opt-in via WhatsApp during registration.
3. Auto-generated SEO slug from model name (collision-safe with `-2/-3/...` suffix) — frozen at registration so old inbound links don't break, and **regenerates on rename** when the operator changes the model name.
4. Creator dashboard at `/creator/logged` with **all profile fields editable**: photos, contact channels, body stats, services, status, social, last seen.
5. Up to **12 image slots** uploadable per creator; primary image drives the featured carousel + preview hero.
6. Image upload goes to GCS via `POST /api/upload?folder=creators` (cleaned-image variants served via `/api/clean-image`).
7. Editable fields: model name, age, gender, **Category**, **Orientation**, **Location** (multi-select), nationality, ethnicity, eyes, hair colour, hair length, height, weight, **Travel** (default "Travel To Meet"), available-for, meeting-with, smoker/tattoo/piercing flags, About Me (free-text), services, phone, WhatsApp, Telegram, WeChat.
8. Empty Phone/SMS auto-fills from WhatsApp (and vice versa) on save.
9. Public profile preview URL: `/creator/preview/<slug>` — visible immediately after profile save.
10. **Last Seen** auto-set on every profile save (admin-visible signal of activity).
11. Sticky navigation back to dashboard, password change inline.
12. Image deletion proxies to the API for DB + GCS deletion in one call.
13. Creator can toggle their own active state via the dashboard (effectively suspending public visibility without deleting the account).
14. Service Area defaults to "All Bali" on first save when blank.

## 6. Admin — Ads Management

1. Dedicated tab in the admin sidebar at `/admin/logged/ads`.
2. **All 20 home slots + bottom slot** managed in one screen.
3. Slots **grouped by page**: HOMEPAGE (10 slots) and CREATOR PAGE (10 slots).
4. Each group renders three explicit rows: landscape leaderboards / portrait side rails / card-area first row.
5. **Slot ID** + **format tag** (LANDSCAPE / PORTRAIT / CARD) shown on every card.
6. **Placement description** under each ID — e.g. "Homepage · Side, Top Left (desktop ≥1392px)" — in brand-gold so it reads at a glance.
7. **Image upload** per slot — file picker, drag-drop, instant GCS upload via `/api/upload?folder=ads`.
8. **Inline upload error surfacing** below the UPLOAD button (no silent failures).
9. **Click-URL** input per slot with validation (https-only, target=_blank on the public site).
10. **CLEAR** button per slot wipes image + URL locally; "SAVE ALL ADS" commits to DB.
11. **Unsaved-changes border** (amber outline + "UNSAVED" tag) on every dirty card.
12. Per-card aspect preview (16:9 for landscape, 9:16 for portrait) so the operator sees how the upload will look in context.
13. Bulk **SAVE ALL ADS** — POSTs/DELETEs only changed slots, never blocks on unchanged ones.
14. Empty-everything saves auto-DELETE the slot row (clean DB state).
15. Original-quality serving: ad images are NEVER routed through the Sharp/WebP optimisation pipeline.
16. Audit trail: `advertising_space_history` table records every change for forensic recovery.

## 7. Admin — Creator Management

1. Tab at `/admin/logged/creators`.
2. Two grouped tables: **ACTIVE** and **INACTIVE** creators with counts.
3. Each row shows: username, last-seen timestamp, registration date, action buttons.
4. **VIEW** opens a modal with every column from the `providers` row.
5. Inline **EDIT** mode in the view modal — all fields editable.
6. Boolean fields (active, smoker, tattoo, piercing) edit as Yes/No selects.
7. **SAVE** persists via `PUT /admin/accounts/creators/<id>`.
8. **DELETE** with two-step confirmation ("Are you sure?" → "YES, DELETE").
9. **Soft suspend**: setting `is_active=false` moves the creator from ACTIVE to INACTIVE without deleting the row.
10. Stats card on the dashboard shows total registered creators count.
11. Featured Girls picker on the dashboard: 4 admin-curated names that drive the homepage carousel.
12. Each creator's public slug + URL exposed in the modal so the admin can copy/share the live link.
13. Edits trigger immediate cache invalidation in `/creators/filter-options` (60s TTL).
14. Last-seen field stays in sync with the creator's own profile saves, providing an activity signal.

## 8. Admin — User Management

1. Tab at `/admin/logged/users`.
2. Single table of registered members: username, registration date, action.
3. **VIEW / EDIT** modal mirrors the creator-management modal.
4. Edit any column from the `app_accounts` row + linked `user_profiles`.
5. Password reset performed by setting a new password directly (bcrypt-hashed on save).
6. **DELETE** removes the account + profile after a two-step confirmation.
7. Stats card on the dashboard shows total registered users count.
8. Tracks new sign-ups in `app_accounts.created_at` so the admin can spot growth.
9. Account suspension via an `is_active` toggle (when needed; default true).
10. Auto-redirect to `/admin` if the admin's own session expires while in this tab (no infinite loop).
11. Filter by username via the URL query (`?q=`) for quick lookup at scale.
12. Manual creation **not** exposed — members register themselves; this keeps the audit trail honest.

## 9. Admin — Blog Management

1. Tab at `/admin/logged/blogs`.
2. Full **CRUD** for blog posts.
3. **Three required inputs** per post: Title, Hero Image, Article body (markdown).
4. Optional inputs: Excerpt, Publish date/time, Hero image alt text.
5. Hero image upload via `/api/upload?folder=blogs` — stored in GCS at `baligirls/blogs/`.
6. **Slug auto-generated** from the title with `-2/-3/...` collision suffix.
7. **Slug regenerates on title rename** so SEO URLs stay accurate; old slug 404s cleanly.
8. **Pagination** auto-adjusts: 9 cards per page on the public `/blog`; the 10th post starts page 2.
9. Markdown body rendered with `react-markdown` (headings, lists, tables, bold/italic, blockquotes).
10. Drafts: leaving `published_at` empty hides the post from the public list (admin still sees it).
11. **All SEO** auto-derived from the 3 inputs: title → `<title>`, excerpt or first 157 body chars → meta description, hero → og:image, slug → URL + canonical, publish date → `datePublished` in JSON-LD.
12. JSON-LD `BlogPosting` injected into the first byte of HTML for crawlers.
13. **404 status** on unknown blog slugs at the Express layer.
14. Sitemap auto-includes every published blog slug.
15. Inline preview of the hero image inside the editor before save.
16. 4 seed articles already loaded: Men's Circles, Mantak Chia, Sex vs Walking calories, Yoga for Men (+ 7 added later: Cold Plunges, Lifting after 35, Tantra, Magnesium, Bali for Solo Men, Morning Sunlight, Indonesian Coffee).
17. **DELETE** with confirm; removes both the DB row and (eventually) the GCS object.

## 10. Admin — Dashboard, Site Settings & Operations

1. Single login at `/admin` (separate role-gated portal — `requireRole(["admin"])`).
2. Top of dashboard: 2 stats cards (registered creators count, registered users count).
3. **Site Settings** card with two independent text fields:
   - HEADER SUBTITLE — small text under "FREE BALI GIRLS" in the global header.
   - HOMEPAGE TAGLINE — large H2 banner on the homepage.
4. Each setting has its own **SAVE** button (no need to bulk-save).
5. **Featured Girls** picker: 4 dropdowns of all active creators; drives the homepage carousel.
6. **Change Password** inline.
7. Tabs nav across the top: Dashboard / Ads / Creators / Users / Blogs.
8. All admin endpoints require a valid admin JWT — 401s redirect cleanly to `/admin` login.
9. **Maintenance Mode** toggle (file-flag) — admin can take the site offline + show the branded "Back Shortly" page without any service restart, while keeping operator IP exempted.
10. PM2 cluster mode for the API (2 workers) + fork mode for the web tier — zero-downtime restarts after a deploy.
11. Built-in audit table `advertising_space_history` for ad-change forensics.
12. All sensitive endpoints (`/admin/*`) gated by role check at the Express layer + at the React layer.

## 11. SEO & Discoverability

1. Server-side meta injection for every public route — title, description, og, twitter, canonical.
2. Per-creator and per-blog JSON-LD structured data.
3. Slug-based URLs (`/creator/preview/<slug>`, `/blog/<slug>`) — readable, indexable.
4. Dynamic `/sitemap.xml` rebuilt on every request (1-hour cache).
5. `robots.txt` permits the public surface, blocks admin + member-only + API.
6. Real `404` status codes on unknown creators and blogs (vs SPA fallback 200).
7. `Retry-After: 3600` on the maintenance 503 — search engines treat as temporary.
8. Open Graph image per page (creator hero, blog hero, default `/og-image.png`).
9. Twitter card tags mirror og tags.
10. Canonical URL hygiene: single `baligirls.gaiada2.online` host, HTTPS-only (Certbot-issued).
11. Alt text on every public image: creator photos (`<name> profile photo`), gallery (`<name> photo <n>`), ads (host or slot), blog hero (post title).
12. Old `/creator/preview/<uuid>` URLs still resolve (slug-or-UUID accepted by the API).

## 12. Authentication & Security

1. **Ed25519-signed JWTs** for all sessions (asymmetric — public key on the server, private key for issuance).
2. **24-hour strict access token TTL** — no refresh tokens, no silent re-issue.
3. Three independent portals: `/user`, `/creator`, `/admin` — each with role-locked login.
4. WhatsApp-based 2FA flow (env-flagged) for sensitive logins.
5. Password reset uses a short-lived JWT with a `purpose=password_reset` claim — cannot be confused for an access token.
6. All passwords stored as bcrypt hashes.
7. `requireAuth` + `requireRole` middleware on every admin endpoint.
8. CSRF-safe by design — APIs accept JSON bodies + bearer tokens only.
9. nginx + Let's Encrypt for transport security.
10. Rate-limit middleware on auth endpoints to throttle brute-force attempts.
11. `helmet`-style security headers via nginx (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`).
12. Logged-out 401s never redirect on the login page itself — no infinite redirect loop.
13. Visitor analytics (`visitor_analytics`) deliberately separated from PII tables.

## 13. Performance & Reliability

1. Vite build produces hashed JS/CSS bundles, 1-year-immutable cache via nginx.
2. PM2 cluster mode for the API (2 workers) + fork mode for the web tier.
3. Postgres 18.3 with raw SQL via the `pg.ts` pool — explicit, debuggable queries.
4. 60s in-memory cache on `/creators/filter-options` (homepage hit on every page load).
5. nginx disk cache (7-day) for `/api/clean-image/*` (creator images).
6. LCP optimisation: hero portrait preloaded via `<link rel="preload" as="image">` in the HTML head, before JS hydrates.
7. Pre-sized `<img width height>` attributes everywhere — zero cumulative layout shift on cards and ads.
8. Lazy-loaded admin and account pages (split into separate chunks; homepage doesn't pay for them).
9. `requestAnimationFrame`-throttled scroll listeners on the parallax side ads.
10. Real-IP-aware analytics beacon — buffered + sent on `pagehide` for low-overhead tracking.
11. Sitemap and ad-settings endpoints cached at the application layer to limit DB hits.
12. Hot-deploy: `git pull && pnpm build && pm2 restart` rolls a new release in under 15 seconds with zero downtime in cluster mode.

## 14. Operations & Maintenance

1. Production host: GCE `gda-pn01`, `asia-southeast1-a`, project `gda-viceroy`.
2. nginx vhost at `/etc/nginx/sites-enabled/baligirls` (TLS via Certbot).
3. App code at `/var/www/baligirls`; git clone for deploys at `/home/azlan/repos/ascortbali_live`.
4. PM2 processes: `baligirls-api` (port 8001, cluster, 2 workers) + `baligirls-web-vite` (port 8002, fork).
5. **Maintenance Mode**: `touch /var/www/baligirls/maintenance/.on` (offline) / `rm /var/www/baligirls/maintenance/.on` (online).
   - Operator IP (currently 194.5.82.35) bypasses the gate and sees the live site.
   - Returns 503 + Retry-After 3600 to everyone else (SEO-safe).
   - No nginx reload needed.
6. Postgres at `localhost:5432`, database `ascortbali`, user `ascortbali`.
7. GCS bucket `gda-ce01-bucket`, service-account key at `/etc/gda-credentials/gda-viceroy-...json`.
8. Daily logs: PM2 captures stdout/stderr; nginx access at `/var/log/nginx/baligirls_access.log`.
9. Migrations folder: `app/api/prisma/migrations/` — SQL applied via `psql` (Prisma's `migrate dev` is disabled because the DB user lacks shadow-DB privilege).
10. Reference docs live in `/var/www/baligirls/references/` (this file, change requests, architecture notes).

