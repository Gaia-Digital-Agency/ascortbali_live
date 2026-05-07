"use client";
import { AdSlot } from "./AdvertisingSpaces";

type AdSlotName =
  | "home-1" | "home-2" | "home-3" | "home-4"
  | "home-5" | "home-6" | "home-7" | "home-8";

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
//   +10 sits the ad's inner edge 10px OUTSIDE the wrapper-left edge —
//       which is the same as the cards' edge (cards align flush to the
//       wrapper). 10px is a tight, intentional breathing gap.
//   net: 506 = the inner-anchor offset.
//
// The outer-pad floor calc(50vw + 320px) translates "ad's outer edge sits
// 16px from the viewport edge" into containing-block-relative right/left
// coordinates.
const LEFT_AD_RIGHT  = "min(calc(50% + 506px), calc(50vw + 320px))";
const RIGHT_AD_LEFT  = "min(calc(50% + 506px), calc(50vw + 320px))";
const SIDE_AD_WIDTH  = "160px";
const SIDE_AD_HEIGHT = "600px";
const STICKY_TOP     = "100px";
// 16px gap between the two stacked ads (matches the rest of the layout's gap-4 spacing).
const STACK_GAP      = "16px";

// Threshold 1376px: minimum viewport width at which the 160px ad fits
// beside the 992px content (max-w-5xl − px-4) with positive gaps.
//   992 (content) + 10 (inner gap) + 160 (ad) + 16 (viewport margin) =
//   1178 per side, doubled from centerline → minimum vw ≈ 1376.
const ABSOLUTE_AD_CLASS =
  "hidden min-[1376px]:block absolute pointer-events-none !mt-0";

const STICKY_INNER_CLASS = "sticky pointer-events-auto flex flex-col";

// Hardcoded slot assignment — the same pair of ads renders on every page
// that has side ads, regardless of which page it is. This is intentional
// (the previous per-page split — home-1/2 on home, home-3/4 on creator
// preview — has been replaced with one consistent set).
const LEFT_SLOTS:  readonly [AdSlotName, AdSlotName] = ["home-1", "home-2"] as const;
const RIGHT_SLOTS: readonly [AdSlotName, AdSlotName] = ["home-3", "home-4"] as const;

/**
 * LEFT side ads — home-1 (top) + home-2 (bottom), stacked.
 * Flush against content's left edge, sticky-bounded vertically.
 */
export function LeftSideAd({ aspect = "4/15" }: { aspect?: AdAspect } = {}) {
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
        className={STICKY_INNER_CLASS}
        style={{
          top: STICKY_TOP,
          width: SIDE_AD_WIDTH,
          gap: STACK_GAP,
        }}
      >
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={LEFT_SLOTS[0]} aspect={aspect} bare />
        </div>
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={LEFT_SLOTS[1]} aspect={aspect} bare />
        </div>
      </div>
    </div>
  );
}

/**
 * RIGHT side ads — home-3 (top) + home-4 (bottom), stacked.
 * Flush against content's right edge, sticky-bounded vertically.
 */
export function RightSideAd({ aspect = "4/15" }: { aspect?: AdAspect } = {}) {
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
        className={STICKY_INNER_CLASS}
        style={{
          top: STICKY_TOP,
          width: SIDE_AD_WIDTH,
          gap: STACK_GAP,
        }}
      >
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={RIGHT_SLOTS[0]} aspect={aspect} bare />
        </div>
        <div style={{ width: SIDE_AD_WIDTH, height: SIDE_AD_HEIGHT }}>
          <AdSlot slot={RIGHT_SLOTS[1]} aspect={aspect} bare />
        </div>
      </div>
    </div>
  );
}

// Back-compat aliases (old names used elsewhere)
export const LeftSidebarAd = LeftSideAd;
export const RightSidebarAd = RightSideAd;

/**
 * Mobile-only horizontal-scroll row of all four portrait ads
 * (home-1..home-4). The desktop layout pins them to the page sides via
 * Left/RightSideAd above (≥1376px); below that breakpoint those float
 * elements are display:none, leaving the ads invisible. This component
 * shows them on mobile/tablet as a horizontally scrollable strip so
 * advertisers still get inventory below the desktop threshold.
 */
export function MobileAdsRow({ aspect = "4/15" }: { aspect?: AdAspect } = {}) {
  return (
    <div className="block min-[1376px]:hidden">
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 -mx-4 px-4"
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
