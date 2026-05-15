import type { AdSpace } from "./types";
import { ImageAdEditor } from "./ImageAdEditor";

export function AdsTab({
  ads, savedAds, isAdsDirty, savingSlot, savingAllAds, adsMsg,
  onUpdateAd, onClearSlot, onSaveAll, onClearAdsMsg,
}: {
  ads: AdSpace[];
  savedAds: AdSpace[];
  isAdsDirty: boolean;
  savingSlot: string | null;
  savingAllAds: boolean;
  adsMsg: string | null;
  onUpdateAd: (slot: AdSpace["slot"], patch: Partial<AdSpace>) => void;
  onClearSlot: (slot: AdSpace["slot"]) => void;
  onSaveAll: () => void;
  onClearAdsMsg: () => void;
}) {
  return (
    <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.22em] text-brand-muted">IMAGE ADS (1-4 PORTRAIT · 5-8 LANDSCAPE)</div>
          <p className="mt-1 text-[11px] text-brand-muted/80">
            Upload / change / clear as many as you want, then click <span className="text-brand-gold">SAVE ALL ADS</span> to apply.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdsDirty ? (
            <span className="text-[11px] text-amber-300">Unsaved changes</span>
          ) : adsMsg ? (
            <span className="text-[11px] text-emerald-400">{adsMsg}</span>
          ) : null}
          <button
            onClick={onSaveAll}
            disabled={savingAllAds || !isAdsDirty}
            className="btn btn-primary px-4 py-2 text-xs"
          >
            {savingAllAds ? "SAVING..." : "SAVE ALL ADS"}
          </button>
        </div>
      </div>

      {/* Slot cards grouped by page. Each row keeps the same card width so
          landscape slots show as wider cells beside the portrait/card rows. */}
      {([
        {
          heading: "HOMEPAGE",
          rows: [
            ["home-5","home-6"] as const,
            ["home-1","home-2","home-3","home-4"] as const,
            ["home-9","home-10","home-11","home-12"] as const,
          ],
        },
        {
          heading: "CREATOR PAGE",
          rows: [
            ["home-7","home-8"] as const,
            ["home-13","home-14","home-15","home-16"] as const,
            ["home-17","home-18","home-19","home-20"] as const,
          ],
        },
      ] as const).map((group) => {
        const totalSlots = group.rows.reduce((n, r) => n + r.length, 0);
        return (
          <div key={group.heading} className="mt-6">
            <div className="mb-3 flex items-baseline gap-3">
              <div className="text-[11px] font-medium tracking-[0.32em] text-brand-gold/90">
                {group.heading}
              </div>
              <div className="text-[10px] tracking-[0.18em] text-brand-muted/70">
                {totalSlots} SLOTS
              </div>
            </div>
            <div className="space-y-5">
              {group.rows.map((row, ri) => (
                <div key={ri} className="grid gap-5 grid-cols-2 md:grid-cols-4">
                  {row.map((slot) => {
                    const ad = ads.find((item) => item.slot === slot);
                    const prev = savedAds.find((s) => s.slot === slot);
                    const slotDirty =
                      !prev ||
                      (prev.image ?? null) !== (ad?.image ?? null) ||
                      (prev.link_url ?? null) !== (ad?.link_url ?? null);
                    return (
                      <ImageAdEditor
                        key={slot}
                        slot={slot}
                        image={ad?.image ?? null}
                        linkUrl={ad?.link_url ?? null}
                        busy={savingSlot === slot || savingAllAds}
                        dirty={slotDirty}
                        onChange={(image) => { onUpdateAd(slot, { image }); onClearAdsMsg(); }}
                        onChangeLinkUrl={(link_url) => { onUpdateAd(slot, { link_url }); onClearAdsMsg(); }}
                        onClear={() => onClearSlot(slot)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="mt-5 flex items-center justify-end">
        <button
          onClick={onSaveAll}
          disabled={savingAllAds || !isAdsDirty}
          className="btn btn-primary px-5 py-2.5 text-xs"
        >
          {savingAllAds ? "SAVING..." : "SAVE ALL ADS"}
        </button>
      </div>
    </div>
  );
}
