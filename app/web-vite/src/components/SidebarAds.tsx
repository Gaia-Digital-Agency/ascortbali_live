"use client";
import { useEffect, useRef } from "react";
import { AdSlot } from "./AdvertisingSpaces";

// Drift the side ads at this fraction of the page-scroll speed. 0 = sticky
// (no movement during scroll), 1 = normal scroll. ~0.3 means the ads move
// at ~70% of page-scroll speed — "slightly slower than the page".
const PARALLAX_FACTOR = 0.3;

// Translate the ad's inner column by a fraction of the page scroll. We
// keep the existing absolute outer / inner-column structure so the
// containing-block positioning math doesn't change; we just shift the
// inner column via transform on every scroll frame.
function useParallaxRef() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf: number | null = null;
    const apply = () => {
      raf = null;
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translateY(${window.scrollY * PARALLAX_FACTOR}px)`;
    };
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

type AdSlotName =
  | "home-1" | "home-2" | "home-3" | "home-4"
  | "home-5" | "home-6" | "home-7" | "home-8"
  | "home-9" | "home-10" | "home-11" | "home-12"
  | "home-13" | "home-14" | "home-15" | "home-16"
  | "home-17" | "home-18" | "home-19" | "home-20";

type AdAspect = "9/16" | "16/9" | "4/1" | "4/15";

/*
  Sidebar ads — TWO stacked 160 × 600 IAB skyscrapers per side, sticky-bounded.

  Slot assignment (consistent across every page that has side ads):
    Left  side: home-1 (top) + home-2 (bottom)
    Right side: home-3 (top) + home-4 (bottom)

  Layout
  ──────
  Each side is rendered as TWO nested divs:

    [outer]  position: absolute, top: 0, bottom: 0, right/left anchored
             flush against the centered max-w-5xl content. Width 160px.
             Spans the full vertical range of the page wrapper — its parent
             must have `position: relative`.

    [inner]  position: sticky, top: 100px, flex column with two AdSlots.
             Pinned to viewport top while the outer is in view; on tall
             enough viewports both ads are visible simultaneously, on
             shorter ones the second ad is partially clipped at the
             bottom of the viewport (still revealed as content scrolls).

  Visibility threshold: viewport >= 1376px (see derivation below). Below
  that, side ads are hidden and the page reads as a single column.
*/

// Inner-anchor magic numbers (Layout main is now max-w-5xl = 1024px):
//   496 = half of the relative wrapper's content box (1024 − main's
//         px-4 = 992px wide → 50% = 496px)
//   +16 sits the ad's inner edge 16px OUTSIDE the wrapper-left edge,
//       matching gap-4 (16px) used between the four featured cards and
//       between the two stacked side ads. All gaps in the row are now
//       a consistent 16px (cards↔cards, ads↔cards, ads↔ads).
//   net: 512 = the inner-anchor offset.
//
// The outer-pad floor calc(50vw + 320px) translates "ad's outer edge sits
// 16px from the viewport edge" into containing-block-relative right/left
// coordinates.
const LEFT_AD_RIGHT  = "min(calc(50% + 512px), calc(50vw + 320px))";
const RIGHT_AD_LEFT  = "min(calc(50% + 512px), calc(50vw + 320px))";
const SIDE_AD_WIDTH  = "160px";
const SIDE_AD_HEIGHT = "600px";
// 100px below the viewport top when the ads "stick" during scroll. At
// initial render (no scroll) the natural flow position wins, so ad-top
// aligns with the relative wrapper's top edge (= cards row top).
const STICKY_TOP     = "100px";
// 16px gap between the two stacked ads (matches gap-4 elsewhere).
const STACK_GAP      = "16px";

// Threshold 1392px: minimum viewport width at which the 160px ad fits
// beside the 992px content (max-w-5xl − px-4) with consistent 16px gaps.
//   992 (content) + 16 (inner gap) + 160 (ad) + 16 (viewport margin) =
//   1184 per side, doubled from centerline → minimum vw ≈ 1392.
const ABSOLUTE_AD_CLASS =
  "hidden min-[1392px]:block absolute pointer-events-none !mt-0";

// Inner column: NOT sticky anymore — sits at the top of the outer
// container and is shifted by a parallax transform on scroll (see
// useParallaxRef above). will-change hints the browser to keep its
// composited layer ready.
const INNER_CLASS = "pointer-events-auto flex flex-col will-change-transform";

// Hardcoded slot assignment — the same pair of ads renders on every page
// that has side ads, regardless of which page it is. This is intentional
// (the previous per-page split — home-1/2 on home, home-3/4 on creator
// preview — has been replaced with one consistent set).
const LEFT_SLOTS:  readonly [AdSlotName, AdSlotName] = ["home-1", "home-2"] as const;
const RIGHT_SLOTS: readonly [AdSlotName, AdSlotName] = ["home-3", "home-4"] as const;

/**
 * LEFT side ads — TWO stacked portrait ads (top + bottom).
 * Flush against content's left edge, sticky-bounded vertically.
 * Slot pair defaults to homepage (home-1 top, home-2 bottom). Creator
 * Preview passes ["home-13","home-14"] for its own pair.
 */
export function LeftSideAd({
  aspect = "4/15",
  slots = LEFT_SLOTS,
}: { aspect?: AdAspect; slots?: readonly [AdSlotName, AdSlotName] } = {}) {
  const innerRef = useParallaxRef();
  return (
    <div
      className={ABSOLUTE_AD_CLASS}
      style={{
        top: 0,
        bottom: 0,
        right: LEFT_AD_RIGHT,
        width: SIDE_AD_WIDTH,
      }}
      aria-label="Left side advertisements"
    >
      <div
        ref={innerRef}
        className={INNER_CLASS}
        style={{
          width: SIDE_AD_WIDTH,
          gap: STACK_GAP,
        }}
      >
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={slots[0]} aspect={aspect} bare />
        </div>
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={slots[1]} aspect={aspect} bare />
        </div>
      </div>
    </div>
  );
}

/**
 * RIGHT side ads — TWO stacked portrait ads (top + bottom).
 * Mirror of LeftSideAd. Defaults to homepage pair (home-3, home-4).
 */
export function RightSideAd({
  aspect = "4/15",
  slots = RIGHT_SLOTS,
}: { aspect?: AdAspect; slots?: readonly [AdSlotName, AdSlotName] } = {}) {
  const innerRef = useParallaxRef();
  return (
    <div
      className={ABSOLUTE_AD_CLASS}
      style={{
        top: 0,
        bottom: 0,
        left: RIGHT_AD_LEFT,
        width: SIDE_AD_WIDTH,
      }}
      aria-label="Right side advertisements"
    >
      <div
        ref={innerRef}
        className={INNER_CLASS}
        style={{
          width: SIDE_AD_WIDTH,
          gap: STACK_GAP,
        }}
      >
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={slots[0]} aspect={aspect} bare />
        </div>
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={slots[1]} aspect={aspect} bare />
        </div>
      </div>
    </div>
  );
}

// Back-compat aliases (old names used elsewhere)
export const LeftSidebarAd = LeftSideAd;
export const RightSidebarAd = RightSideAd;

// Creator Preview page side ads — home-13/14 (left) + home-15/16 (right).
// Render only at the same ≥1392px threshold as the homepage rails.
export function CreatorLeftSideAd({ aspect = "4/15" }: { aspect?: AdAspect } = {}) {
  return <LeftSideAd aspect={aspect} slots={["home-13", "home-14"] as const} />;
}
export function CreatorRightSideAd({ aspect = "4/15" }: { aspect?: AdAspect } = {}) {
  return <RightSideAd aspect={aspect} slots={["home-15", "home-16"] as const} />;
}

/**
 * Mobile-only horizontal-scroll row of home-1..home-4 (the side-rail ads).
 * Retained as a back-compat export so any page still importing it doesn't
 * break, but the homepage now uses HomeFirstRowAds instead — see below.
 *
 * @deprecated — prefer <HomeFirstRowAds /> on viewports < 1392px.
 */
export function MobileAdsRow({ aspect = "4/15" }: { aspect?: AdAspect } = {}) {
  return (
    <div className="block min-[1392px]:hidden">
      <div
        className="flex snap-x snap-mandatory justify-center gap-3 overflow-x-auto scroll-smooth pb-2 -mx-4 px-4"
        aria-label="Sponsored ads"
      >
        {(["home-1", "home-2", "home-3", "home-4"] as const).map((slot) => (
          <div key={slot} className="w-40 shrink-0 snap-start">
            <AdSlot slot={slot} aspect={aspect} bare />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Four portrait (9:16) ads that render as the first row of the creator
 * grid on viewports where the side-rail ads (home-1..home-4) don't fit
 * (below 1392px). On wider viewports the side rails carry inventory and
 * this row is hidden, so each ad slot is shown in exactly one place at a
 * time and there's no duplication.
 *
 * The grid mirrors the creator grid below it (2 cols on mobile, 4 cols
 * on md+), so the four ad cards visually integrate as if they're the
 * first row of creator cards.
 */
export function HomeFirstRowAds() {
  // aspect="auto" lets each ad card size to the image's natural ratio
  // (no crop). items-start keeps cards aligned to the top of the grid
  // row when their heights differ — otherwise the grid stretches every
  // card to the tallest sibling, defeating the purpose of using natural
  // dimensions.
  return (
    <div className="block min-[1392px]:hidden">
      <div
        className="grid grid-cols-2 items-start gap-4 md:grid-cols-4"
        aria-label="Sponsored ads"
      >
        {(["home-9", "home-10", "home-11", "home-12"] as const).map((slot) => (
          <AdSlot key={slot} slot={slot} aspect="auto" />
        ))}
      </div>
    </div>
  );
}

/**
 * Creator Preview equivalent of HomeFirstRowAds — home-17..20 as the first
 * row of the "Explore Next Girl" creator-card area. Only visible below
 * 1392px, where the Creator Preview side rails (home-13..16) don't fit.
 */
export function CreatorFirstRowAds() {
  return (
    <div className="block min-[1392px]:hidden">
      <div
        className="grid grid-cols-2 items-start gap-4 md:grid-cols-4"
        aria-label="Sponsored ads"
      >
        {(["home-17", "home-18", "home-19", "home-20"] as const).map((slot) => (
          <AdSlot key={slot} slot={slot} aspect="auto" />
        ))}
      </div>
    </div>
  );
}
