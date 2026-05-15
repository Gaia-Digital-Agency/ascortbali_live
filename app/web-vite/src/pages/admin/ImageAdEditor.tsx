import { useRef, useState } from "react";
import type { AdSlot } from "./types";

// Exclude the "bottom" slot — it has its own text-card editor, not this one.
type ImageSlot = Exclude<AdSlot, "bottom">;

export function ImageAdEditor({
  slot, image, busy, dirty, linkUrl, onChange, onChangeLinkUrl, onClear,
}: {
  slot: ImageSlot;
  image: string | null; busy: boolean; dirty: boolean; linkUrl: string | null;
  onChange: (value: string) => void; onChangeLinkUrl: (value: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  // Slot format classification:
  //   landscape: home-5..8 (4:1 leaderboards above/below grids)
  //   portrait:  home-1..4, home-13..16 (4:15 sidebar skyscrapers)
  //   card:      home-9..12, home-17..20 (9:16 first-row creator-card area)
  const isLandscape = slot === "home-5" || slot === "home-6" || slot === "home-7" || slot === "home-8";
  const isCard =
    slot === "home-9"  || slot === "home-10" || slot === "home-11" || slot === "home-12" ||
    slot === "home-17" || slot === "home-18" || slot === "home-19" || slot === "home-20";
  const formatLabel = isLandscape ? "LANDSCAPE" : isCard ? "CARD" : "PORTRAIT";

  // Where each slot appears on the site — shown under the slot name so the
  // operator knows what they're uploading without checking the code.
  const placement: Record<ImageSlot, string> = {
    "home-1":  "Homepage · Side, Top Left (desktop ≥1392px)",
    "home-2":  "Homepage · Side, Bottom Left (desktop ≥1392px)",
    "home-3":  "Homepage · Side, Top Right (desktop ≥1392px)",
    "home-4":  "Homepage · Side, Bottom Right (desktop ≥1392px)",
    "home-5":  "Homepage · Top (landscape)",
    "home-6":  "Homepage · Bottom (landscape)",
    "home-7":  "Creator Page · Top (landscape)",
    "home-8":  "Creator Page · Bottom (landscape)",
    "home-9":  "Homepage · Top Creator Card Area, position 1 (tablet/mobile <1392px)",
    "home-10": "Homepage · Top Creator Card Area, position 2 (tablet/mobile <1392px)",
    "home-11": "Homepage · Top Creator Card Area, position 3 (tablet/mobile <1392px)",
    "home-12": "Homepage · Top Creator Card Area, position 4 (tablet/mobile <1392px)",
    "home-13": "Creator Page · Side, Top Left (desktop ≥1392px)",
    "home-14": "Creator Page · Side, Bottom Left (desktop ≥1392px)",
    "home-15": "Creator Page · Side, Top Right (desktop ≥1392px)",
    "home-16": "Creator Page · Side, Bottom Right (desktop ≥1392px)",
    "home-17": "Creator Page · Top Creator Card Area, position 1 (tablet/mobile <1392px)",
    "home-18": "Creator Page · Top Creator Card Area, position 2 (tablet/mobile <1392px)",
    "home-19": "Creator Page · Top Creator Card Area, position 3 (tablet/mobile <1392px)",
    "home-20": "Creator Page · Top Creator Card Area, position 4 (tablet/mobile <1392px)",
  };

  const upload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "ads");
    const res = await fetch(`/api/upload`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Upload failed");
    onChange(data.url);
  };

  return (
    <div className={`flex flex-col gap-2 rounded-2xl border ${dirty ? "border-amber-400/60" : "border-brand-line"} bg-brand-surface2/40 p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs tracking-[0.22em] text-brand-muted uppercase">
            {slot} ({formatLabel})
          </div>
          <div className="mt-1 text-[11px] leading-snug text-brand-gold/85">
            {placement[slot]}
          </div>
        </div>
        {dirty ? <span className="shrink-0 text-[9px] text-amber-300 tracking-[0.18em]">UNSAVED</span> : null}
      </div>
      <div className={`${isLandscape ? "aspect-[16/9]" : "aspect-[3/4]"} overflow-hidden rounded-xl border border-brand-line`}>
        {image ? (
          <img
            src={image}
            alt={`Ad slot ${slot}`}
            width={isLandscape ? 1280 : 360}
            height={isLandscape ? 720 : 640}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.22em] text-brand-muted">EMPTY</div>
        )}
      </div>
      <input
        className="w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-1.5 text-[10px] outline-none placeholder:text-brand-muted/50 focus:border-brand-gold/60"
        value={linkUrl ?? ""}
        onChange={(e) => onChangeLinkUrl(e.target.value)}
        placeholder="Click URL (https://...)"
      />
      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || uploading} className="btn btn-primary btn-block px-2 py-2 text-[11px]">
          {uploading ? "UPLOADING..." : busy ? "..." : "UPLOAD"}
        </button>
        <button type="button" onClick={onClear} disabled={busy || uploading} className="btn btn-outline btn-block px-2 py-2 text-[11px]">
          CLEAR
        </button>
        {uploadErr ? (
          <div className="text-[10px] text-red-400 leading-tight">{uploadErr}</div>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          setUploadErr(null);
          try {
            await upload(file);
          } catch (err) {
            setUploadErr((err as Error).message || "Upload failed");
          }
          finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
          }
        }}
      />
    </div>
  );
}
