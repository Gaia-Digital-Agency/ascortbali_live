import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { FeaturedCarousel, AdSlot, useSiteSettings } from "../components/AdvertisingSpaces";
import { LeftSidebarAd, RightSidebarAd } from "../components/SidebarAds";
import { CreatorFilterControls } from "../components/CreatorFilterControls";
import { PageMeta, SITE_BASE, SITE_NAME } from "../components/PageMeta";
import { CATEGORY_DEMS, parseCategoryCsv } from "../lib/creatorOptions";
import { DemsIcon } from "../components/DemsIcons";

type Creator = {
  uuid: string;
  slug?: string | null;
  model_name?: string | null;
  username?: string | null;
  image_file?: string | null;
  age?: number | null;
  nationality?: string | null;
  height?: string | null;
  // Comma-separated category tokens (e.g. "escort,massage"). Drives the
  // DEMS badge under each name on the card.
  escort_type?: string | null;
};

// 4-icon category indicator rendered next to each creator's name. The icon
// uses an active (gold circle) variant when the creator's escort_type CSV
// includes that DEMS token; otherwise a dim (charcoal) variant.
// Non-interactive — purely a visual indicator.
function DemsBadge({ form }: { form?: string | null }) {
  const set = parseCategoryCsv(form);
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label="Categories" role="text">
      {CATEGORY_DEMS.map(({ letter, token }) => (
        <DemsIcon key={letter} letter={letter} active={set.has(token)} />
      ))}
    </span>
  );
}

const toImageUrl = (file?: string | null) => {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("/")) return withBasePath(file);
  const parts = file.split("/");
  const filename = parts[parts.length - 1];
  return withBasePath(`/api/clean-image/${encodeURIComponent(filename)}`);
};

// 18 creators + 2 in-grid ads = 20 cells per page.
const PAGE_SIZE = 18;
const ADS_PER_PAGE = 2;
// 8-card pool. Pages 1-4 consume the pool once (2 ads each * 4 pages = 8);
// pages 5+ cycle back to the start.
const IN_GRID_AD_POOL = [
  "home-9", "home-10", "home-11", "home-12",
  "home-17", "home-18", "home-19", "home-20",
] as const;

// Mulberry32 deterministic PRNG — given a seed returns a stable 0..1
// sequence. Same seed → same sequence, so the layout doesn't flicker on
// re-render. We combine page number + day-of-epoch into the seed so the
// layout is stable within a day and rotates at Bali midnight.
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Whole-day number in Bali time (UTC+8). All visitors see the same value
// during one Bali calendar day; the value increments at 00:00 WITA.
// We use Bali because the audience and operator both live on Bali time.
function getDayNumber(): number {
  const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
  return Math.floor((Date.now() + WITA_OFFSET_MS) / (24 * 60 * 60 * 1000));
}

// Fisher-Yates shuffle with a seeded RNG. Same seed → same permutation.
function shuffleDeterministic<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  const rng = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Build the 20-cell layout for one page: 18 creator slots + 2 ad slots.
// Returns an array of cells in render order. Ads come from IN_GRID_AD_POOL.
//
// Daily rotation: both the ad SELECTION (which 2 of the 8 pool slots appear
// on this page) and the ad POSITIONS within the page rotate at midnight
// Bali time. Within a single calendar day the layout is stable, so
// crawlers + analytics see consistent positions on re-visits.
function buildPageCells<T>(
  creators: T[],
  page: number,
): Array<{ kind: "creator"; data: T } | { kind: "ad"; slot: typeof IN_GRID_AD_POOL[number] }> {
  const dayNum = getDayNumber();

  // Daily-shuffled pool. Pages then consume the pool in deterministic
  // pairs: pages 1-4 take the 8 ads once; pages 5+ cycle back.
  const todayPool = shuffleDeterministic(IN_GRID_AD_POOL, dayNum);
  const base = ((page - 1) * ADS_PER_PAGE) % todayPool.length;
  const adSlots = [
    todayPool[base],
    todayPool[(base + 1) % todayPool.length],
  ];

  const totalCells = creators.length + ADS_PER_PAGE;
  // Position seed: combine page number + day so every (page, day) pair
  // gets its own deterministic position draw.
  const rng = seededRandom(page * 10000 + dayNum);

  // Pick two non-adjacent positions in [0, totalCells).
  // Constraint: |pos1 - pos2| >= 2 (also avoid 0 if you want, but
  // first-row ads are fine).
  let pos1 = Math.floor(rng() * totalCells);
  let pos2 = Math.floor(rng() * totalCells);
  let guard = 0;
  while ((pos1 === pos2 || Math.abs(pos1 - pos2) < 2) && guard < 40) {
    pos2 = Math.floor(rng() * totalCells);
    guard++;
  }
  // Last-resort deterministic fallback if the RNG keeps colliding.
  if (pos1 === pos2 || Math.abs(pos1 - pos2) < 2) {
    pos1 = 2;
    pos2 = totalCells - 3;
  }

  const adPositions = [
    { pos: pos1, slot: adSlots[0] },
    { pos: pos2, slot: adSlots[1] },
  ].sort((a, b) => a.pos - b.pos);

  const out: Array<{ kind: "creator"; data: T } | { kind: "ad"; slot: typeof IN_GRID_AD_POOL[number] }> = [];
  let ci = 0; // creator index
  for (let i = 0; i < totalCells; i++) {
    const ad = adPositions.find((a) => a.pos === i);
    if (ad) {
      out.push({ kind: "ad", slot: ad.slot });
    } else {
      const c = creators[ci++];
      if (c !== undefined) out.push({ kind: "creator", data: c });
    }
  }
  return out;
}

const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();

const normalizeName = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!raw) return "GIRL";
  const stripped = raw
    .replace(/^\s*(?:Escort|Girl|Miss)\s+/i, "")
    .replace(/\s*-\s*.*$/, "")
    .replace(/\s*[|,].*$/, "")
    .trim();
  const base = stripped || raw;
  return base.toUpperCase();
};

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const settings = useSiteSettings();

  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const selectedNationality = normalize(searchParams.get("nationality"));
  const selectedAge = normalize(searchParams.get("age"));
  const selectedHeight = normalize(searchParams.get("height"));
  const selectedGender = normalize(searchParams.get("gender"));
  const selectedServiceArea = normalize(searchParams.get("serviceArea"));
  const selectedCategory = normalize(searchParams.get("category"));

  const [pageItems, setPageItems] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<{
    nationalities: string[];
    // Heights are 2-inch bands: { value: '64', label: '5\'4" - 5\'5" / 163-167 cm' }
    heights: Array<{ value: string; label: string }>;
    genders: string[];
    serviceAreas: string[];
    categories: string[];
  }>({
    nationalities: [],
    heights: [],
    genders: [],
    serviceAreas: [],
    categories: [],
  });

  const tagline = settings?.tagline || "BALI GIRLS";

  // Server-paginated + filtered creator list. Refires when the URL params
  // change. Was a single fetch of /creators?limit=500 with client-side
  // pagination + filtering; now the server does both.
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        if (selectedNationality) params.set("nationality", selectedNationality);
        if (selectedAge) params.set("age", selectedAge);
        if (selectedHeight) params.set("height", selectedHeight);
        if (selectedGender) params.set("gender", selectedGender);
        if (selectedServiceArea) params.set("serviceArea", selectedServiceArea);
        if (selectedCategory) params.set("category", selectedCategory);
        const res = await fetch(`${API_BASE}/creators?${params.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setPageItems(Array.isArray(data.items) ? data.items : []);
          setTotal(typeof data.total === "number" ? data.total : 0);
        }
      } catch {
        if (controller.signal.aborted) return;
        setPageItems([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [page, selectedNationality, selectedAge, selectedHeight, selectedGender, selectedServiceArea, selectedCategory]);

  // Filter dropdown universe — fetched once, server-cached for 60s.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/creators/filter-options`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFilterOptions({
          nationalities: Array.isArray(data.nationalities) ? data.nationalities : [],
          heights: Array.isArray(data.heights) ? data.heights : [],
          genders: Array.isArray(data.genders) ? data.genders : [],
          serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
        });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true };
  }, []);

  const nationalityOptions = filterOptions.nationalities;
  const heightOptions = filterOptions.heights;
  const genderOptions = filterOptions.genders;
  const serviceAreaOptions = filterOptions.serviceAreas;
  const categoryOptions = filterOptions.categories;
  const ageOptions = ["18-24", "25-29", "30-34", "35+"];

  const hasActiveFilters = Boolean(
    selectedNationality || selectedAge || selectedHeight ||
    selectedGender || selectedServiceArea || selectedCategory
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const makePageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (selectedNationality) params.set("nationality", selectedNationality);
    if (selectedAge) params.set("age", selectedAge);
    if (selectedHeight) params.set("height", selectedHeight);
    if (selectedGender) params.set("gender", selectedGender);
    if (selectedServiceArea) params.set("serviceArea", selectedServiceArea);
    if (selectedCategory) params.set("category", selectedCategory);
    return `/?${params.toString()}`;
  };

  const Pagination = () => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          to={makePageHref(p)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border text-xs ${
            p === safePage
              ? "border-brand-gold bg-brand-gold/20 text-brand-text"
              : "border-brand-line text-brand-muted hover:border-brand-gold hover:text-brand-text"
          }`}
        >
          {p}
        </Link>
      ))}
    </div>
  );

  // JSON-LD Organization schema for the homepage. Helps search engines
  // identify the site as a coherent brand.
  const orgJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_BASE,
    logo: `${SITE_BASE}/baligirls_logo.png`,
  });

  return (
    <div className="space-y-3">
      <PageMeta
        title="Bali Girls — Free, Real, Simple"
        description="A marketplace connecting creators and members in Bali. Browse featured profiles, ads, and services."
        path="/"
      />
      <Helmet>
        <script type="application/ld+json">{orgJsonLd}</script>
      </Helmet>
      <div className="relative space-y-10">
        {/* Floating side ads — TWO ads stacked per side, hardcoded in
            SidebarAds.tsx (left = home-1+home-2, right = home-3+home-4).
            They start at the top of THIS wrapper (= cards row top) and
            bottom-out at the wrapper's bottom (= bottom of last section). */}
        <LeftSidebarAd />
        <RightSidebarAd />

        {/* 1. Featured Girls cards (label is now above this wrapper) */}
        <section>
          <FeaturedCarousel categoryFilter={selectedCategory} />
        </section>

      {/* 2. Tagline heading "Free, Real, Simple" — now BEFORE the top ad */}
      <section>
        <h2 className="font-display text-3xl md:text-4xl text-center md:text-left">{tagline}</h2>
        {hasActiveFilters ? (
          <p className="mt-3 text-sm text-brand-muted">Matched creators: {total}.</p>
        ) : null}
      </section>

      {/* 3. TOP ad — home-5 (4:1 leaderboard, full container width).
           priority=true marks it as a mobile-LCP candidate (it sits just
           below the FeaturedCarousel and is often above the fold on
           tall phones). */}
      <section>
        <AdSlot slot="home-5" aspect="4/1" eager priority />
      </section>

      {/* 4. Filter controls */}
      <section>
        <CreatorFilterControls
          selectedNationality={selectedNationality}
          selectedAge={selectedAge}
          selectedHeight={selectedHeight}
          selectedGender={selectedGender}
          selectedServiceArea={selectedServiceArea}
          selectedCategory={selectedCategory}
          nationalityOptions={nationalityOptions}
          ageOptions={ageOptions}
          heightOptions={heightOptions}
          genderOptions={genderOptions}
          serviceAreaOptions={serviceAreaOptions}
          categoryOptions={categoryOptions}
          className="md:grid-cols-4 lg:grid-cols-7"
        />
      </section>

      {/* Top pagination removed — only the bottom Pagination remains. */}

      {/* MobileAdStrip removed: the new portrait ads are 4:15 skyscrapers
          and don't fit a side-by-side strip. Mid-viewport users still see
          the home-5/home-6 leaderboards above + below the grid. */}

      {/* 5. Creator grid — full container width, 5 cols on xl+ */}
      <section className="space-y-4">
        {loading ? (
          <div className="grid gap-4 grid-cols-2 [.step-4_&]:grid-cols-2 [.step-3_&]:grid-cols-3 [.step-2_&]:grid-cols-4 [.step-1_&]:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[9/16] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 [.step-4_&]:grid-cols-2 [.step-3_&]:grid-cols-3 [.step-2_&]:grid-cols-4 [.step-1_&]:grid-cols-5">
            {pageItems.length === 0 ? (
              <div className="col-span-full py-10 text-center text-sm text-brand-muted">
                No creators match these filters.
              </div>
            ) : (() => {
              const _cells = buildPageCells(pageItems, page);
              const _firstCreatorIdx = _cells.findIndex(c => c.kind === "creator");
              return _cells.map((cell, i) => {
              if (cell.kind === "ad") {
                // In-grid ad cards. aspect="3/4" so they visually match the creator cards.
                // renders at its natural ratio (matching the home-9..12
                // first-row treatment we replaced).
                return <AdSlot key={`ad-${cell.slot}-${i}`} slot={cell.slot} aspect="3/4" />;
              }
              const isFirst = i === _firstCreatorIdx;
              const creator = cell.data;
              const displayName = normalizeName(creator.model_name || creator.username || "Girl");
              const imageUrl = toImageUrl(creator.image_file);

              if (!imageUrl) return null;

              return (
                <Link
                  key={creator.uuid}
                  to={`/creator/preview/${creator.slug || creator.uuid}`}
                  // flex flex-col so the image takes the remaining vertical
                  // space and the name strip below is a fixed-height row —
                  // prevents the previous min-h-[44px] + h-[10%] combo from
                  // pushing the image past the aspect-ratio box and getting
                  // clipped (which made the NAME look off-center).
                  className="group flex aspect-[9/16] flex-col overflow-hidden rounded-2xl bg-brand-surface/30"
                >
                  <div className="relative flex-1 overflow-hidden">
                    <img
                      src={`${imageUrl}?w=480`}
                      srcSet={`${imageUrl}?w=360 360w, ${imageUrl}?w=480 480w, ${imageUrl}?w=640 640w`}
                      sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      alt={`${displayName} profile photo`}
                      width={480}
                      height={853}
                      loading={isFirst ? "eager" : "lazy"}
                      decoding={isFirst ? "sync" : "async"}
                      {...(isFirst ? ({ fetchPriority: "high" } as ImgHTMLAttributes<HTMLImageElement>) : {})}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                    {/* DEMS category badge — overlaid on the image bottom-right
                        with a translucent blurred backdrop so the icons stay
                        legible against any photo. */}
                    <div className="absolute bottom-1.5 right-1.5 rounded-lg bg-black/30 px-1.5 py-1 backdrop-blur-md ring-1 ring-white/10">
                      <DemsBadge form={creator.escort_type} />
                    </div>
                  </div>
                  {/* Name strip: creator name only. h-14 (56px) keeps the
                      layout fixed so cards still align. shrink-0 prevents the
                      aspect-ratio image from being squeezed when names wrap. */}
                  <div className="flex h-14 shrink-0 items-center justify-center border-t border-brand-line bg-black/40 px-2 text-center text-xs uppercase tracking-[0.14em] leading-tight">
                    <span className="line-clamp-1">{displayName}</span>
                  </div>
                </Link>
              );
            });
              })()}
          </div>
        )}
      </section>

      {/* Second pagination */}
      <section>
        <Pagination />
      </section>

      {/* 6. BOTTOM ad — home-6 (4:1 leaderboard, full container width) */}
      <section>
        <AdSlot slot="home-6" aspect="4/1" />
      </section>
      </div>
    </div>
  );
}
