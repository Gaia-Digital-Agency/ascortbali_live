import { createContext, useContext, useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";

type AdSpace = {
  slot: "home-1" | "home-2" | "home-3" | "home-4" | "home-5" | "home-6" | "home-7" | "home-8" | "bottom";
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
};

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
  { slot: "bottom", image: null, text: "Your Ads Here", link_url: null },
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
    mergeSlot("home-8", fallbackAds[7]),
    mergeSlot("bottom", fallbackAds[8]),
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

export function FeaturedCarousel() {
  const ads = useAdSpaces();
  const settings = useSiteSettings();
  const [girls, setGirls] = useState<(FeaturedCreator | null)[]>([null, null, null, null]);
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
        setGirls(result);
      } catch { /* ignore */ }
    })();
  }, [settings]);

  // 4 girls full width: grid-cols-4 on all non-tiny screens (2x2 on very small)
  const cardClass = "aspect-[9/16] w-full";

  // The "FEATURED GIRLS" label is rendered by HomePage above this component
  // (so it sits above the relative wrapper that contains the side ads — letting
  // the side ads' top:0 align with the cards row, not the label).
  // Mobile (<md): single-row horizontal carousel with snap so one card is
  // primary and the next peeks. md+ collapses back to the 4-col grid.
  const trackClass = "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth -mx-4 px-4 pb-2 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0";
  const slotClass = "block w-[60vw] sm:w-[42vw] shrink-0 snap-start md:w-auto md:shrink md:snap-align-none";

  if (ads === null) {
    return (
      <div className={trackClass}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={slotClass}>
            <div className={`${cardClass} skeleton rounded-2xl border border-brand-line`} />
          </div>
        ))}
      </div>
    );
  }

  const renderGirlCard = (creator: FeaturedCreator | null, index: number) => {
    const imageUrl = toCreatorImageUrl(creator?.image_file);
    const name = creator?.model_name ?? `Featured ${index}`;
    const card = (
      <div className={`${cardClass} flex flex-col overflow-hidden rounded-2xl bg-brand-surface/30`}>
        <div className="flex-1 overflow-hidden">
          {imageUrl ? (
            <img
              src={`${imageUrl}?w=480`}
              srcSet={`${imageUrl}?w=240 240w, ${imageUrl}?w=360 360w, ${imageUrl}?w=480 480w`}
              sizes="(max-width: 640px) 50vw, 240px"
              alt={name + " profile photo"}
              width={360}
              height={640}
              // First card is the mobile LCP candidate — sync decode + high
              // fetchpriority push it to the top of the browser's queue.
              {...(index === 0
                ? ({ fetchPriority: "high", decoding: "sync", loading: "eager" } as ImgHTMLAttributes<HTMLImageElement>)
                : { decoding: "async" as const, loading: index <= 2 ? "eager" as const : "lazy" as const })}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/30 text-xs tracking-[0.22em] text-brand-muted">
              {creator ? "NO IMAGE" : "NOT SET"}
            </div>
          )}
        </div>
        {/* Fixed-height name strip with vertical center alignment. h-11 = 44px
            (matches min-h tap target). flex + items-center handles centering;
            previous h-[10%] + min-h-[44px] combination forced overflow that
            cropped the image and made the label look off-center. */}
        <div className="flex h-11 shrink-0 items-center justify-center border-t border-brand-line bg-black/40 px-2 text-center text-xs uppercase tracking-[0.14em] leading-tight">
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
  slot: "home-1" | "home-2" | "home-3" | "home-4" | "home-5" | "home-6" | "home-7" | "home-8";
  // 9/16 + 16/9 retained for back-compat. 4/15 = skyscraper sidebar (320x1200).
  // 4/1 = leaderboard banner (1940x500).
  aspect?: "9/16" | "16/9" | "4/1" | "4/15";
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
    : "aspect-[9/16]";

  // Card chrome turns into nothing when bare=true — but we still apply the
  // same corner radius as the framed ads, so all ad cards match.
  const chrome = bare
    ? "overflow-hidden rounded-2xl"
    : "overflow-hidden rounded-2xl border border-brand-line bg-brand-surface/50";

  if (!ad) {
    return <div className={`${aspectClass} w-full ${bare ? "rounded-2xl" : "skeleton rounded-2xl border border-brand-line"} ${className}`} />;
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

  // Route uploaded ad images (which live under /api/uploads/baligirls/ads/*
  // as raw PNG/JPEG) through /api/clean-image so they get sharp +
  // AVIF/WebP conversion + width-based resizing. External URLs left alone.
  const uploadedPath = ad.image?.match(/^\/api\/uploads\/(.+)$/)?.[1] ?? null;
  const optimizedSrc = ad.image
    ? (uploadedPath ? `/api/clean-image/${uploadedPath}?w=${dims.width}` : ad.image)
    : null;

  // Responsive srcset only where bytes actually vary by viewport. Skyscraper
  // portraits are narrow so a tiny ladder is enough; leaderboards span the
  // full container width so go wider.
  let srcSet: string | undefined;
  let sizes: string | undefined;
  if (uploadedPath) {
    const url = (w: number) => `/api/clean-image/${uploadedPath}?w=${w}`;
    if (aspect === "4/1") {
      srcSet = `${url(640)} 640w, ${url(960)} 960w, ${url(1280)} 1280w, ${url(1940)} 1940w`;
      sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1024px";
    } else if (aspect === "16/9") {
      srcSet = `${url(640)} 640w, ${url(960)} 960w, ${url(1280)} 1280w`;
      sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1024px";
    } else if (aspect === "4/15") {
      srcSet = `${url(160)} 160w, ${url(320)} 320w`;
      sizes = "(max-width: 1535px) 320px, clamp(240px, calc(50vw - 576px), 600px)";
    } else {
      // 9/16 fallback (legacy)
      srcSet = `${url(240)} 240w, ${url(360)} 360w, ${url(480)} 480w`;
      sizes = "(max-width: 640px) 50vw, 240px";
    }
  }

  const inner = ad.image ? (
    <img
      src={optimizedSrc ?? ad.image}
      srcSet={srcSet}
      sizes={sizes}
      alt={altForAd(ad, slot, alt)}
      width={dims.width}
      height={dims.height}
      loading={eager ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // fetchPriority is honored by Chromium/Safari; ignored elsewhere (safe).
      {...(priority ? ({ fetchPriority: "high" } as ImgHTMLAttributes<HTMLImageElement>) : {})}
      className="h-full w-full object-cover"
      onError={(e) => {
        const fb = fallbackImageBySlot[slot as keyof typeof fallbackImageBySlot];
        if (!fb) return;
        if ((e.currentTarget as HTMLImageElement).src.endsWith(fb)) return;
        (e.currentTarget as HTMLImageElement).src = fb;
      }}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.22em] text-brand-muted">
      {slot.toUpperCase()}
    </div>
  );

  const card = (
    <div className={`${aspectClass} w-full ${chrome} ${className}`}>
      {inner}
    </div>
  );

  return ad.link_url ? (
    <a href={ad.link_url} target="_blank" rel="noreferrer noopener" className="block">{card}</a>
  ) : card;
}
