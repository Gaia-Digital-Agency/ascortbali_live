import { createContext, useContext, useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { CATEGORY_DEMS, parseCategoryCsv } from "../lib/creatorOptions";
import { DemsIcon } from "./DemsIcons";

type AdSpace = {
  slot:
    | "home-1" | "home-2" | "home-3" | "home-4"
    | "home-5" | "home-6" | "home-7" | "home-8"
    | "home-9" | "home-10" | "home-11" | "home-12"
    | "home-13" | "home-14" | "home-15" | "home-16"
    | "home-17" | "home-18" | "home-19" | "home-20"
    | "bottom";
  image: string | null;
  text: string | null;
  link_url: string | null;
};

type SiteSettings = Record<string, string>;

type FeaturedCreator = {
  uuid: string;
  // Optional because legacy admin-created rows may lack one. Prefer slug for
  // link composition, fall back to uuid (the API accepts both).
  slug?: string | null;
  model_name: string;
  image_file: string | null;
  // CSV of DEMS category tokens — drives the overlay badge in featured cards
  // (mirrors the in-grid creator cards on HomePage).
  escort_type?: string | null;
};

function FeaturedDemsBadge({ form }: { form?: string | null }) {
  const set = parseCategoryCsv(form);
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label="Categories" role="text">
      {CATEGORY_DEMS.map(({ letter, token }) => (
        <DemsIcon key={letter} letter={letter} active={set.has(token)} />
      ))}
    </span>
  );
}

// Default links in case DB has no URL yet.
const fallbackLinkBySlot: Record<string, string> = {
  "home-1": "https://lightcyan-horse-210187.hostingersite.com/",
  "home-2": "https://www.humanspedia.com/",
  "home-3": "https://www.baligirls.com/",
};

// Fallback advertising data.
const fallbackAds: AdSpace[] = [
  { slot: "home-1", image: "/api/uploads/baligirls/ads/unique.png", text: null, link_url: fallbackLinkBySlot["home-1"] },
  { slot: "home-2", image: "/api/uploads/baligirls/ads/humapedia.png", text: null, link_url: fallbackLinkBySlot["home-2"] },
  { slot: "home-3", image: null, text: null, link_url: fallbackLinkBySlot["home-3"] },
  { slot: "home-4", image: null, text: null, link_url: null },
  { slot: "home-5", image: null, text: null, link_url: null },
  { slot: "home-6", image: null, text: null, link_url: null },
  { slot: "home-7", image: null, text: null, link_url: null },
  { slot: "home-8", image: null, text: null, link_url: null },
  // home-9..home-12 are 9:16 portrait ads that take over from the side-rail
  // home-1..home-4 on viewports where the side rails don't fit. They render
  // as the first row of the creator grid.
  { slot: "home-9",  image: null, text: null, link_url: null },
  { slot: "home-10", image: null, text: null, link_url: null },
  { slot: "home-11", image: null, text: null, link_url: null },
  { slot: "home-12", image: null, text: null, link_url: null },
  // home-13..home-16: side rails on the Creator Preview page (portrait).
  { slot: "home-13", image: null, text: null, link_url: null },
  { slot: "home-14", image: null, text: null, link_url: null },
  { slot: "home-15", image: null, text: null, link_url: null },
  { slot: "home-16", image: null, text: null, link_url: null },
  // home-17..home-20: first row of the Creator Card Area on Creator Preview
  // (replaces the side rails on viewports where they don't fit).
  { slot: "home-17", image: null, text: null, link_url: null },
  { slot: "home-18", image: null, text: null, link_url: null },
  { slot: "home-19", image: null, text: null, link_url: null },
  { slot: "home-20", image: null, text: null, link_url: null },
  { slot: "bottom",  image: null, text: "Your Ads Here", link_url: null },
];

const fallbackImageBySlot: Partial<Record<AdSpace["slot"], string>> = {
  "home-1": fallbackAds[0].image!,
  "home-2": fallbackAds[1].image!,
};

function normalizeAdImage(image: string | null) {
  const raw = (image ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/api/")) return withBasePath(raw);
  return raw;
}

function normalizeAdSpace(ad: AdSpace): AdSpace {
  return { ...ad, image: normalizeAdImage(ad.image), link_url: ad.link_url?.trim() || null };
}

// Build a meaningful alt for an ad image. Prefer the sponsor's hostname
// (drops www.) so the alt actually identifies who's advertising. Falls back
// to a slot tag only when no link URL is configured.
function altForAd(ad: AdSpace | undefined, slot: string, override?: string) {
  if (override) return override;
  const url = ad?.link_url ?? "";
  if (url) {
    try { return `Sponsor: ${new URL(url).host.replace(/^www\./, "")}`; } catch { /* malformed URL */ }
  }
  return `Advertisement (${slot})`;
}

function toCreatorImageUrl(file?: string | null) {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("/")) {
    return withBasePath(file);
  }
  const parts = file.split("/");
  const filename = parts[parts.length - 1];
  return withBasePath(`/api/clean-image/${encodeURIComponent(filename)}`);
}

// ── Shared ads / settings provider ─────────────────────────────────────
// Before this change, every <AdSlot>, <FeaturedCarousel>, Layout, etc.
// instantiated their own copy of useAdSpaces() / useSiteSettings(), each
// firing its own `/api/ads` and `/api/ads/settings` request — ~6 redundant
// fetches per home render. The provider fetches once and shares via context.
// Two separate contexts so consumers only re-render on the data they read.

const AdsContext = createContext<AdSpace[] | null>(null);
const SettingsContext = createContext<SiteSettings | null>(null);

function mergeAdsResponse(data: AdSpace[]): AdSpace[] {
  const map = new Map(data.map((item) => [item.slot, normalizeAdSpace(item)]));
  const mergeSlot = (slot: AdSpace["slot"], fallback: AdSpace) => {
    const fromApi = map.get(slot);
    if (!fromApi) return fallback;
    return { ...fallback, ...fromApi, image: fromApi.image ?? fallback.image, link_url: fromApi.link_url ?? fallback.link_url };
  };
  return [
    mergeSlot("home-1", fallbackAds[0]),
    mergeSlot("home-2", fallbackAds[1]),
    mergeSlot("home-3", fallbackAds[2]),
    mergeSlot("home-4", fallbackAds[3]),
    mergeSlot("home-5", fallbackAds[4]),
    mergeSlot("home-6", fallbackAds[5]),
    mergeSlot("home-7", fallbackAds[6]),
    mergeSlot("home-8",  fallbackAds[7]),
    mergeSlot("home-9",  fallbackAds[8]),
    mergeSlot("home-10", fallbackAds[9]),
    mergeSlot("home-11", fallbackAds[10]),
    mergeSlot("home-12", fallbackAds[11]),
    mergeSlot("home-13", fallbackAds[12]),
    mergeSlot("home-14", fallbackAds[13]),
    mergeSlot("home-15", fallbackAds[14]),
    mergeSlot("home-16", fallbackAds[15]),
    mergeSlot("home-17", fallbackAds[16]),
    mergeSlot("home-18", fallbackAds[17]),
    mergeSlot("home-19", fallbackAds[18]),
    mergeSlot("home-20", fallbackAds[19]),
    mergeSlot("bottom",  fallbackAds[20]),
  ];
}

export function AdsProvider({ children }: { children: ReactNode }) {
  const [ads, setAds] = useState<AdSpace[] | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Fetch ads
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ads`, { signal: controller.signal });
        if (!res.ok) { setAds(fallbackAds); return; }
        const data = (await res.json()) as AdSpace[];
        setAds(Array.isArray(data) && data.length ? mergeAdsResponse(data) : fallbackAds);
      } catch {
        if (controller.signal.aborted) return;
        setAds(fallbackAds);
      }
    })();
    // Fetch settings
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ads/settings`, { signal: controller.signal });
        if (res.ok) setSettings(await res.json());
      } catch { /* ignore */ }
    })();
    return () => controller.abort();
  }, []);

  return (
    <AdsContext.Provider value={ads}>
      <SettingsContext.Provider value={settings}>
        {children}
      </SettingsContext.Provider>
    </AdsContext.Provider>
  );
}

// Hook signatures preserved so existing consumers don't need changes.
export function useAdSpaces() {
  return useContext(AdsContext);
}

export function useSiteSettings() {
  return useContext(SettingsContext);
}

// ── Featured carousel: Girl 1, Ad 1, Girl 2, Ad 2, Girl 3, Ad 3, Girl 4 ──

export function FeaturedCarousel({ categoryFilter }: { categoryFilter?: string }) {
  const ads = useAdSpaces();
  const settings = useSiteSettings();
  const [girls, setGirls] = useState<(FeaturedCreator | null)[]>([null, null, null, null]);
  // Track whether the featured-girls fetch has settled. The skeleton must stay
  // up until BOTH ads and girls have resolved — otherwise (ads loaded, girls
  // still empty) hasVisibleGirls is false and the carousel returns null,
  // collapsing its reserved height to 0 and then snapping back when girls
  // arrive. That 427px->0->427px bounce was the desktop CLS (0.42).
  const [girlsLoaded, setGirlsLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const girlsScrollRef = useRef<HTMLDivElement>(null);

  // girlsScrollRef retained for backwards-compat but no scroll centering needed now (grid layout)

  // Fetch featured girls based on settings (via /creators/by-names — was a
  // 500-row /creators fetch just to find 4 names by string match).
  useEffect(() => {
    if (!settings) return;
    const names = [
      settings.featured_girl_1,
      settings.featured_girl_2,
      settings.featured_girl_3,
      settings.featured_girl_4,
    ].map((n) => (n ?? "").trim());
    const wanted = names.filter(Boolean);
    if (wanted.length === 0) {
      setGirls([null, null, null, null]);
      setGirlsLoaded(true);
      return;
    }

    (async () => {
      try {
        const qs = encodeURIComponent(wanted.join(","));
        const res = await fetch(`${API_BASE}/creators/by-names?names=${qs}`);
        if (!res.ok) return;
        const data = await res.json();
        const matches = Array.isArray(data.items) ? data.items : [];
        const byLower = new Map<string, FeaturedCreator>(
          matches.map((c: FeaturedCreator) => [(c.model_name ?? "").toLowerCase(), c])
        );
        // Preserve the slot order set in the admin (girl_1..girl_4).
        const result = names.map((name) => name ? byLower.get(name.toLowerCase()) ?? null : null);
        // If a category filter is active, hide featured girls that don't match
        if (categoryFilter) {
          const filtered = result.map((girl) => {
            if (!girl) return null;
            const cats = parseCategoryCsv(girl.escort_type);
            return cats.has(categoryFilter.toLowerCase()) ? girl : null;
          });
          setGirls(filtered);
        } else {
          setGirls(result);
        }
      } catch { /* ignore */ }
      finally { setGirlsLoaded(true); }
    })();
  }, [settings]);

  // 4 girls full width: grid-cols-4 on all non-tiny screens (2x2 on very small)
  const cardClass = "aspect-[9/16] w-full";

  // The "FEATURED GIRLS" label is rendered by HomePage above this component
  // (so it sits above the relative wrapper that contains the side ads — letting
  // the side ads' top:0 align with the cards row, not the label).
  // Mobile (<md): single-row horizontal carousel with snap so one card is
  // primary and the next peeks. md+ collapses back to the 4-col grid.
  // Featured girls layout:
  //   Mobile  (<md): 2-col grid (4 cards = 2×2). Matches the homepage
  //                  creator grid and the Explore Next Girl section so
  //                  the mobile experience is uniformly 2 columns.
  //   Desktop (md+): 4-col grid (single row).
  const trackClass = "grid grid-cols-2 gap-4 md:grid-cols-4";
  // Each card fills its grid cell naturally — no fixed viewport widths.
  const slotClass = "block";

  if (ads === null || !girlsLoaded) {
    return (
      <div className={trackClass}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={slotClass}>
            <div className={`${cardClass} skeleton rounded-2xl border border-brand-gold/70`} />
          </div>
        ))}
      </div>
    );
  }

  const renderGirlCard = (creator: FeaturedCreator | null, index: number) => {
    const imageUrl = toCreatorImageUrl(creator?.image_file);
    const name = creator?.model_name ?? `Featured ${index}`;
    const card = (
      <div className={`${cardClass} flex flex-col overflow-hidden rounded-2xl border border-brand-gold/70 bg-brand-surface/30`}>
        <div className="relative flex-1 overflow-hidden">
          {imageUrl ? (
            <img
              src={`${imageUrl}?w=480`}
              srcSet={`${imageUrl}?w=240 240w, ${imageUrl}?w=360 360w, ${imageUrl}?w=480 480w`}
              sizes="(max-width: 640px) 50vw, 240px"
              alt={name + " profile photo"}
              width={480}
              height={640}
              // First card gets fetchpriority=high + sync decode. The featured
              // carousel is only a handful of above-the-fold cards, and on
              // mobile the *largest-painted* one (the actual LCP) can be a later
              // card — so all featured cards load eagerly to keep the LCP image
              // off the lazy-load queue. (Lighthouse flagged a lazy LCP image.)
              {...(index === 0
                ? ({ fetchPriority: "high", decoding: "sync", loading: "eager" } as ImgHTMLAttributes<HTMLImageElement>)
                : { decoding: "async" as const, loading: index <= 3 ? "eager" as const : "lazy" as const })}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/30 text-xs tracking-[0.22em] text-brand-muted">
              {creator ? "NO IMAGE" : "NOT SET"}
            </div>
          )}
          {creator ? (
            <div className="absolute bottom-1.5 right-1.5 rounded-lg bg-black/30 px-1.5 py-1 backdrop-blur-md ring-1 ring-white/10">
              <FeaturedDemsBadge form={creator.escort_type} />
            </div>
          ) : null}
        </div>
        {/* Fixed-height name strip. h-14 (56px) matches the in-grid creator
            and ad cards (HomePage two-row strip with DEMS badge), so the
            featured row aligns vertically with the grid below. */}
        <div className="flex h-14 shrink-0 items-center justify-center border-t border-brand-line bg-black/40 px-2 text-center text-xs uppercase tracking-[0.14em] leading-tight">
          {name}
        </div>
      </div>
    );
    return creator ? (
      <a key={`girl-${index}`} className={slotClass} href={withBasePath(`/creator/preview/${creator.slug || creator.uuid}`)}>{card}</a>
    ) : (
      <div key={`girl-${index}`} className={slotClass}>{card}</div>
    );
  };


  // When a category filter is active, skip rendering the featured carousel
  // entirely if none of the featured girls match the filter (avoids showing
  // 4 empty placeholder cards).
  const hasVisibleGirls = categoryFilter
    ? girls.some((g) => g !== null)
    : girls.some((g) => g !== null);

  if (!hasVisibleGirls) return null;

  return (
    <div ref={scrollRef}>
      <div ref={girlsScrollRef} className={trackClass}>
        {renderGirlCard(girls[0], 1)}
        {renderGirlCard(girls[1], 2)}
        {renderGirlCard(girls[2], 3)}
        {renderGirlCard(girls[3], 4)}
      </div>
    </div>
  );
}

// Component for Ad 4 image (between Back to Top and bottom text).
export function Ad4Card() {
  const ads = useAdSpaces();
  const ad4 = ads?.find((a) => a.slot === "home-4");
  if (!ad4?.image) return null;

  const content = (
    <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-brand-line bg-brand-surface/50">
      <img src={ad4.image} alt={altForAd(ad4, "home-4")} width={1280} height={720} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  );

  return ad4.link_url ? (
    <a href={ad4.link_url} target="_blank" rel="noreferrer noopener">{content}</a>
  ) : content;
}

// Component for Tagline (editable via admin).
export function Tagline() {
  const settings = useSiteSettings();
  const tagline = settings?.tagline || "Meet your girl for free and ...";

  return <h2 className="font-display text-3xl md:text-4xl">{tagline}</h2>;
}

/**
 * Generic ad slot renderer. Shows the ad image (or placeholder) for the given slot.
 * Supports different aspect ratios depending on where the ad is placed.
 */
export function AdSlot({
  slot,
  aspect = "9/16",
  className = "",
  alt,
  eager = false,
  priority = false,
  bare = false,
}: {
  slot:
    | "home-1" | "home-2" | "home-3" | "home-4"
    | "home-5" | "home-6" | "home-7" | "home-8"
    | "home-9" | "home-10" | "home-11" | "home-12"
    | "home-13" | "home-14" | "home-15" | "home-16"
    | "home-17" | "home-18" | "home-19" | "home-20";
  // 9/16 + 16/9 retained for back-compat. 4/15 = skyscraper sidebar (320x1200).
  // 4/1 = leaderboard banner (1940x500). "auto" = no fixed aspect, the card
  // sizes to the image's natural ratio (used for home-9..12 / home-17..20 so
  // admin-supplied images of any shape display without cropping).
  aspect?: "9/16" | "3/4" | "16/9" | "4/1" | "4/15" | "auto";
  className?: string;
  alt?: string;
  eager?: boolean;
  priority?: boolean;
  // bare = drop the card chrome (rounded corners, border, surface bg). Used by
  // sidebars where the ad should sit edge-to-edge against the content with no
  // visible card frame.
  bare?: boolean;
}) {
  const ads = useAdSpaces();
  const ad = ads?.find((a) => a.slot === slot);
  const aspectClass =
    aspect === "16/9" ? "aspect-[16/9]"
    : aspect === "4/1" ? "aspect-[4/1]"
    : aspect === "4/15" ? "aspect-[4/15]"
    : aspect === "3/4" ? "aspect-[9/16]"
    : aspect === "auto" ? ""
    : "aspect-[9/16]";

  // For aspect="auto" the image renders at its natural ratio (w-full h-auto)
  // and the card height follows. Every other aspect uses a fixed aspect box
  // with object-cover for crop-to-fill.
  const isAuto = aspect === "auto";

  // In-grid 3/4 ads mirror the creator-card chrome (no border, same surface bg)
  // so they sit cleanly next to the creator cards. Every other aspect keeps
  // the legacy border-brand-line frame.
  const isCreatorGridAd = aspect === "3/4";
  // Every in-grid 3/4 ad gets the bottom strip regardless of whether the
  // admin filled in a description — the strip is what keeps the ad card
  // the same total height as the creator card next to it. The text just
  // becomes empty when nothing is configured for that slot.
  const showGridStrip = isCreatorGridAd;
  const chrome = bare
    ? "overflow-hidden rounded-2xl"
    : isCreatorGridAd
      ? "overflow-hidden rounded-2xl bg-brand-surface/30"
      : "overflow-hidden rounded-2xl border border-brand-line bg-brand-surface/50";

  if (!ad) {
    // Fall back to a 9:16 box when aspect="auto" — the loading skeleton
    // needs some height before the image arrives.
    const skClass = aspectClass || "aspect-[9/16]";
    return <div className={`${skClass} w-full ${bare ? "rounded-2xl" : "skeleton rounded-2xl border border-brand-line"} ${className}`} />;
  }

  // Intrinsic dimensions matching the aspect — pin the actual ad pixel
  // dimensions for the new banner formats so the browser knows the natural
  // size (helps with CLS + responsive image picking).
  const dims = aspect === "16/9"
    ? { width: 1280, height: 720 }
    : aspect === "4/1"
      ? { width: 1940, height: 500 }   // matches uploaded landscape PNG dims
      : aspect === "4/15"
        ? { width: 320, height: 1200 } // matches uploaded portrait PNG dims
        : { width: 360, height: 640 };

  // Route operator ad images through the /api/clean-image resizer (sharp +
  // AVIF/WebP negotiation + width resize) instead of shipping the raw multi-MB
  // PNG/JPEG straight from GCS. clean-image accepts a full GCS path, so we just
  // swap the /api/uploads/ prefix for /api/clean-image/ and add ?w=. A raw
  // 1.1 MB ad PNG drops to ~50 KB WebP / ~37 KB AVIF this way. External/CDN
  // URLs (anything not under /api/uploads/) pass through untouched.
  const adIsUploads = !!ad.image && /\/api\/uploads\//.test(ad.image);
  const adCleanUrl = (w: number) => {
    const m = (ad.image as string).match(/\/api\/uploads\/(.+?)(?:\?.*)?$/);
    return m ? `${withBasePath(`/api/clean-image/${m[1]}`)}?w=${w}` : (ad.image as string);
  };
  const adSrc = ad.image ? (adIsUploads ? adCleanUrl(dims.width) : ad.image) : null;
  const adSrcSet = ad.image && adIsUploads
    ? `${adCleanUrl(Math.round(dims.width / 2))} ${Math.round(dims.width / 2)}w, ${adCleanUrl(dims.width)} ${dims.width}w`
    : undefined;
  const adSizes = adIsUploads ? (isAuto ? "100vw" : `${dims.width}px`) : undefined;

  const inner = ad.image ? (
    <img
      src={adSrc ?? ad.image}
      {...(adSrcSet ? { srcSet: adSrcSet, sizes: adSizes } : {})}
      alt={altForAd(ad, slot, alt)}
      width={dims.width}
      height={dims.height}
      loading={eager ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // fetchPriority is honored by Chromium/Safari; ignored elsewhere (safe).
      {...(priority ? ({ fetchPriority: "high" } as ImgHTMLAttributes<HTMLImageElement>) : {})}
      className={isAuto ? "block h-auto w-full" : "h-full w-full object-cover"}
      onError={(e) => {
        const fb = fallbackImageBySlot[slot as keyof typeof fallbackImageBySlot];
        if (!fb) return;
        if ((e.currentTarget as HTMLImageElement).src.endsWith(fb)) return;
        (e.currentTarget as HTMLImageElement).src = fb;
      }}
    />
  ) : (
    <div className={
      isAuto
        // No fixed parent height with aspect="auto" — use a 9:16 placeholder
        // box so empty slots stay visible.
        ? "flex aspect-[9/16] w-full items-center justify-center text-xs tracking-[0.22em] text-brand-muted"
        : "flex h-full w-full items-center justify-center text-xs tracking-[0.22em] text-brand-muted"
    }>
      {slot.toUpperCase()}
    </div>
  );

  // For every in-grid 3/4 ad we mirror the creator card layout: image fills
  // the remaining vertical space, a fixed h-14 strip holds the admin-typed
  // description (or sits empty when there is no description). Keeping the
  // strip always-present is what makes ad rows visually line up with the
  // creator rows next to them.
  const card = showGridStrip ? (
    <div className={`${aspectClass} w-full flex flex-col ${chrome} ${className}`}>
      <div className="flex-1 overflow-hidden">{inner}</div>
      <div className="flex h-14 shrink-0 items-center justify-center border-t border-brand-line bg-black/40 px-2 text-center text-[11px] uppercase tracking-[0.14em] leading-tight">
        {ad?.text?.trim() || ""}
      </div>
    </div>
  ) : (
    <div className={`${aspectClass} w-full ${chrome} ${className}`}>
      {inner}
    </div>
  );

  return ad.link_url ? (
    <a href={ad.link_url} target="_blank" rel="noreferrer noopener" className="block">{card}</a>
  ) : card;
}
