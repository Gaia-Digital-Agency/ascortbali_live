import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { FeaturedCarousel, AdSlot, useSiteSettings } from "../components/AdvertisingSpaces";
import { LeftSidebarAd, RightSidebarAd } from "../components/SidebarAds";
import { CreatorFilterControls } from "../components/CreatorFilterControls";

type Creator = {
  uuid: string;
  model_name?: string | null;
  username?: string | null;
  image_file?: string | null;
  age?: number | null;
  nationality?: string | null;
  height?: string | null;
};

const toImageUrl = (file?: string | null) => {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("/")) return withBasePath(file);
  const parts = file.split("/");
  const filename = parts[parts.length - 1];
  return withBasePath(`/api/clean-image/${encodeURIComponent(filename)}`);
};

const PAGE_SIZE = 25;

const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();

const normalizeName = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!raw) return "CREATOR";
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

  const [pageItems, setPageItems] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<{ nationalities: string[]; heights: string[] }>({
    nationalities: [],
    heights: [],
  });

  const tagline = settings?.tagline || "FREE BALI GIRLS";

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
  }, [page, selectedNationality, selectedAge, selectedHeight]);

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
        });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true };
  }, []);

  const nationalityOptions = filterOptions.nationalities;
  const heightOptions = filterOptions.heights;
  const ageOptions = ["18-24", "25-29", "30-34", "35+"];

  const hasActiveFilters = Boolean(selectedNationality || selectedAge || selectedHeight);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const makePageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (selectedNationality) params.set("nationality", selectedNationality);
    if (selectedAge) params.set("age", selectedAge);
    if (selectedHeight) params.set("height", selectedHeight);
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

  return (
    <div className="space-y-3">
      {/* "FEATURED GIRLS" label — kept OUTSIDE the relative wrapper so the
          side ads (which use the wrapper's top edge as their anchor) line up
          with the cards row instead of the label. */}
      <div className="text-xs tracking-[0.22em] text-brand-muted">FEATURED GIRLS</div>

      <div className="relative space-y-10">
        {/* Floating side ads — TWO ads stacked per side, hardcoded in
            SidebarAds.tsx (left = home-1+home-2, right = home-3+home-4).
            They start at the top of THIS wrapper (= cards row top) and
            bottom-out at the wrapper's bottom (= bottom of last section). */}
        <LeftSidebarAd />
        <RightSidebarAd />

        {/* 1. Featured Girls cards (label is now above this wrapper) */}
        <section>
          <FeaturedCarousel />
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
          nationalityOptions={nationalityOptions}
          ageOptions={ageOptions}
          heightOptions={heightOptions}
          className="md:grid-cols-4"
        />
      </section>

      {/* Top pagination removed — only the bottom Pagination remains. */}

      {/* MobileAdStrip removed: the new portrait ads are 4:15 skyscrapers
          and don't fit a side-by-side strip. Mid-viewport users still see
          the home-5/home-6 leaderboards above + below the grid. */}

      {/* 5. Creator grid — full container width, 5 cols on xl+ */}
      <section>
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
            ) : pageItems.map((creator) => {
              const displayName = normalizeName(creator.model_name || creator.username || "Creator");
              const imageUrl = toImageUrl(creator.image_file);

              if (!imageUrl) return null;

              return (
                <Link
                  key={creator.uuid}
                  to={`/creator/preview/${creator.uuid}`}
                  // flex flex-col so the image takes the remaining vertical
                  // space and the name strip below is a fixed-height row —
                  // prevents the previous min-h-[44px] + h-[10%] combo from
                  // pushing the image past the aspect-ratio box and getting
                  // clipped (which made the NAME look off-center).
                  className="group flex aspect-[9/16] flex-col overflow-hidden rounded-2xl border border-brand-line bg-brand-surface/50"
                >
                  <div className="flex-1 overflow-hidden">
                    <img
                      src={`${imageUrl}?w=480`}
                      srcSet={`${imageUrl}?w=360 360w, ${imageUrl}?w=480 480w, ${imageUrl}?w=640 640w`}
                      sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      alt={`${displayName} profile photo`}
                      width={480}
                      height={853}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  {/* Fixed-height (h-11 = 44px) name strip. flex + items-center
                      vertically centers the text. shrink-0 keeps the strip
                      from being squeezed when the name wraps. */}
                  <div className="flex h-11 shrink-0 items-center justify-center border-t border-brand-line bg-black/40 px-2 text-center text-xs uppercase tracking-[0.14em] leading-tight">
                    {displayName}
                  </div>
                </Link>
              );
            })}
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
