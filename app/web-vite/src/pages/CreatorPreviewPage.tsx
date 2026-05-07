import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE, apiFetch, getAccessToken } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { AdSlot } from "../components/AdvertisingSpaces";
import { LeftSidebarAd, RightSidebarAd } from "../components/SidebarAds";
import { PageMeta, SITE_BASE } from "../components/PageMeta";

type CreatorData = {
  title: string;
  creatorName: string;
  slug: string;            // for canonical URL
  description: string;     // 160-char notes excerpt for meta description
  primaryImageUrl: string | null;
  fields: Array<[string, string | number | undefined]>;
  images: Array<{ id?: string; imageUrl?: string | null }>;
};

type ExploreCreator = {
  uuid: string;
  slug?: string | null;
  displayName: string;
  imageUrl: string;
};

const toImageUrl = (file?: string | null) => {
  if (!file) return null;
  if (file.startsWith("http://") || file.startsWith("https://")) return file;
  if (file.startsWith("/")) return withBasePath(file);
  const parts = file.split("/");
  const filename = parts[parts.length - 1];
  return withBasePath(`/api/clean-image/${encodeURIComponent(filename)}`);
};

const normalizeCreatorName = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!raw) return "CREATOR";
  const stripped = raw
    .replace(/^\s*(?:Escort|Girl|Miss)\s+/i, "")
    .replace(/\s*-\s*.*$/, "")
    .replace(/\s*[|,].*$/, "")
    .trim();
  const base = stripped || raw;
  // CAPITALIZE: ALL UPPERCASE
  return base.toUpperCase();
};

export default function CreatorPreviewPage() {
  // The route param is named :slug now (Phase D), but the API accepts either
  // a slug or a UUID. Local var name kept generic.
  const { slug: idOrSlug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CreatorData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canViewFull, setCanViewFull] = useState(false);
  const [exploreCreators, setExploreCreators] = useState<ExploreCreator[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/creators/${idOrSlug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        const raw = json.creator as any;
        const images: Array<{ id?: string; file?: string }> = ((json.images as any[]) ?? []).map((img) => ({
          id: img.image_id,
          file: img.image_file,
        }));

        const displayName = normalizeCreatorName(raw.model_name || raw.name || "Creator");
        const hairLength = raw.hair_length || raw["Hair lenght"];
        const primaryImageUrl = images.length > 0 ? toImageUrl(images[0]?.file) : null;

        // Fetch 8 random others for the Explore Next Girl section. Was a
        // /creators?limit=500 + client-side shuffle — now /creators/random
        // does the random pick + exclude on the server.
        try {
          const listRes = await fetch(
            `${API_BASE}/creators/random?n=8&exclude=${encodeURIComponent(idOrSlug ?? "")}`
          );
          if (listRes.ok) {
            const listData = await listRes.json();
            const list = Array.isArray(listData.items) ? listData.items : [];
            const picks: ExploreCreator[] = list.map((c: any) => ({
              uuid: c.uuid,
              slug: c.slug ?? null,
              displayName: normalizeCreatorName(c.model_name || c.username || "Creator"),
              imageUrl: toImageUrl(c.image_file) || "",
            })).filter((c: ExploreCreator) => c.imageUrl);
            setExploreCreators(picks);
          }
        } catch { /* ignore */ }

        // Field order rule: the LAST FOUR rows are always the contact channels
        // (Phone/SMS, Whatsapp, Telegram, WeChat ID), in that order, regardless
        // of whether the creator filled them in. Empty values render as an
        // em-dash placeholder via the row template below — never hidden.
        // Title-case the FORM tag for display ("escort" -> "Escort").
        const formRaw = String(raw.form ?? raw.escort_type ?? "").trim().toLowerCase();
        const formDisplay = formRaw ? formRaw.charAt(0).toUpperCase() + formRaw.slice(1) : "";
        const fields: Array<[string, string | number | undefined]> = [
          ["Name", displayName],
          // Form sits at the top so it's the first thing a viewer sees.
          ["Form", formDisplay],
          ["Age", raw.age],
          ["Gender", raw.gender],
          ["Nationality", raw.nationality],
          ["Languages", raw.languages],
          ["City", raw.city],
          ["Country", raw.country],
          ["Location", raw.location],
          ["Hair Color", raw.hair_color],
          ["Hair Length", hairLength],
          ["Height", raw.height],
          ["Weight", raw.weight],
          ["Meeting With", raw.meeting_with],
          ["About Me", raw.services],
          // Last four: contact channels — always shown, em-dash if missing.
          ["Phone/SMS", raw.phone_number],
          ["Whatsapp", raw.cell_phone],
          ["Telegram", raw.telegram_id],
          ["WeChat ID", raw.wechat_id],
        ];

        const imagesLimited = images.slice(0, 20);
        // Build a meta-description from the about-me text (notes column), or
        // fall back to a generic line. Trim to 160 chars to fit the SERP
        // snippet target.
        const rawNotes = String(raw.notes ?? "").replace(/\s+/g, " ").trim();
        const description = rawNotes
          ? (rawNotes.length > 160 ? rawNotes.slice(0, 157) + "..." : rawNotes)
          : `${displayName} on Bali Girls — meet creators in Bali. Photos, profile, contact.`;
        setData({
          title: displayName,
          creatorName: displayName,
          slug: String(raw.slug ?? raw.uuid ?? ""),
          description,
          primaryImageUrl,
          fields,
          images: imagesLimited
            .map((img) => ({ id: img.id, imageUrl: toImageUrl(img.file) }))
            .filter((img) => Boolean(img.imageUrl)),
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [idOrSlug]);

  useEffect(() => {
    const hasAuthToken = Boolean(getAccessToken());
    if (!hasAuthToken) { setCanViewFull(false); return; }
    (async () => {
      try {
        const me = await apiFetch("/me");
        setCanViewFull(Boolean(me?.role));
      } catch {
        setCanViewFull(false);
      }
    })();
  }, []);

  // Close lightbox on ESC
  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxImage(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxImage]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-48" />
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6">
            <div className="skeleton aspect-[9/16] w-full rounded-2xl" />
          </div>
          <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 space-y-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-5 w-full" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="text-brand-muted">Creator not found.</div>
        <Link to="/" className="btn btn-outline">BACK HOME</Link>
      </div>
    );
  }

  // Guest gating: only the contact channels (last 4 rows of DETAILS) are now
  // gated. Photos and the rest of the profile information are always public.
  const contactBlurInnerClass = canViewFull ? "" : "blur-md pointer-events-none select-none";
  // Last 4 rows of `fields` are the contact channels (Phone/SMS, Whatsapp,
  // Telegram, WeChat ID — see the array constructor above). Everything before
  // them is profile information.
  const profileFields = data.fields.slice(0, -4);
  const contactFields = data.fields.slice(-4);

  // Build absolute og:image URL from the (relative) primaryImageUrl. If the
  // creator has no images, fall back to the site default in PageMeta.
  const ogImage = data.primaryImageUrl
    ? (data.primaryImageUrl.startsWith("http") ? data.primaryImageUrl : `${SITE_BASE}${data.primaryImageUrl}`)
    : undefined;

  return (
    <div className="relative space-y-8">
      <PageMeta
        title={`${data.creatorName} — Bali Girls`}
        description={data.description}
        path={`/creator/preview/${data.slug}`}
        image={ogImage}
      />
      {/* Floating side ads — TWO ads stacked per side, hardcoded in
          SidebarAds.tsx (left = home-1+home-2, right = home-3+home-4).
          Range = top of TOP ad to bottom of BOTTOM ad. */}
      <LeftSidebarAd />
      <RightSidebarAd />

      {/* TOP ad — home-7 (4:1 leaderboard, full container width) */}
      <section>
        <AdSlot slot="home-7" aspect="4/1" eager />
      </section>

      {/* CREATOR / Name header */}
      <section>
        <div className="text-xs tracking-luxe text-brand-muted">CREATOR</div>
        <h1 className="mt-2 font-display text-3xl">{data.title}</h1>
      </section>

      {/* MobileAdStrip removed (4:15 skyscrapers don't fit a strip layout). */}

      {/* Main content — full container width (sidebars are floating outside) */}
      <div>
        <div className="space-y-8">
          <section className="grid gap-4 md:grid-cols-2">
            {/* Feature image — chrome dropped; image fills the column. */}
            <button
              type="button"
              onClick={() => data.primaryImageUrl && setLightboxImage(data.primaryImageUrl)}
              className="block aspect-[9/16] w-full overflow-hidden rounded-2xl cursor-zoom-in"
              aria-label="Open photo in popup"
            >
              {data.primaryImageUrl ? (
                // LCP candidate for the detail page — high fetch priority
                // and explicit dimensions for CLS.
                <img
                  src={data.primaryImageUrl}
                  alt={data.creatorName}
                  width={720}
                  height={1280}
                  loading="eager"
                  decoding="sync"
                  {...({ fetchPriority: "high" } as ImgHTMLAttributes<HTMLImageElement>)}
                  className="h-full w-full object-cover hover:scale-[1.02] transition duration-500"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-surface/30 text-xs text-brand-muted">NO IMAGE</div>
              )}
            </button>

            {/* DETAILS — split into two zones:
                  • Profile information (always visible to everyone).
                  • Contact channels (Phone/SMS, Whatsapp, Telegram, WeChat ID)
                    blurred for guests, with a MEMBERS ONLY overlay sitting
                    only on top of the contact rows — not the whole card.
                A subtle border-top + larger margin gives a clear visual
                separation between the two zones. */}
            <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6">
              <div className="text-xs tracking-luxe text-brand-muted">DETAILS</div>
              <div className="mt-4 grid gap-3">
                {profileFields.map(([label, value]) => (
                  // items-start (not center) so long values wrap cleanly under
                  // their own column without overlapping the label.
                  // gap-4 keeps the label legible when the value wraps.
                  // Value: min-w-0 + break-words let long un-spaced strings
                  // (e.g. concatenated services) break across lines instead
                  // of overflowing into the label.
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-brand-line/60 pb-2 text-sm"
                  >
                    <span className="shrink-0 text-brand-muted">{label}</span>
                    <span className="min-w-0 break-words text-right text-brand-text">
                      {value === null || value === undefined || value === "" ? "\u2014" : value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Visual separator + CONTACT sub-heading. mt-8 + a top border
                  is the "slight separation" between profile info and the
                  contact area. */}
              <div className="mt-8 border-t border-brand-line pt-5">
                <div className="text-xs tracking-luxe text-brand-muted">CONTACT</div>

                {/* relative wrapper anchors the MEMBERS ONLY overlay over JUST
                    the four contact rows (not the whole DETAILS card). */}
                <div className="relative mt-4">
                  <div className={contactBlurInnerClass}>
                    <div className="grid gap-3">
                      {contactFields.map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4 border-b border-brand-line/60 pb-2 text-sm"
                        >
                          <span className="shrink-0 text-brand-muted">{label}</span>
                          <span className="min-w-0 break-words text-right text-brand-text">
                            {value === null || value === undefined || value === "" ? "\u2014" : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!canViewFull ? (
                    // Overlay covers only the contact subsection. Centered on
                    // both axes; pointer-events-none on the wrapper + auto on
                    // the inner card keep the CTAs clickable while the blurred
                    // grid behind stays inert.
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-2">
                      <div className="rounded-2xl border border-brand-gold bg-brand-bg/90 p-5 shadow-luxe text-center max-w-xs pointer-events-auto">
                        <div className="text-xs tracking-luxe text-brand-muted mb-3">MEMBERS ONLY</div>
                        <div className="text-sm text-brand-text mb-4">Register or login to view contact details.</div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Link to="/user/register" className="btn btn-primary px-4 py-2 text-xs">REGISTER</Link>
                          <Link to="/user" className="btn btn-outline px-4 py-2 text-xs">LOGIN</Link>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Image gallery — chrome dropped (no card border, no label). The
              grid now sits flush in the page, matching the bare feature
              image above. Images themselves are public; contact gating is
              handled in the DETAILS section above. */}
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.images.length === 0 ? (
                <div className="text-sm text-brand-muted">No cleaned image files found.</div>
              ) : (
                data.images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => img.imageUrl && setLightboxImage(img.imageUrl)}
                    className="group overflow-hidden rounded-2xl cursor-zoom-in"
                  >
                    <div className="aspect-[9/16] w-full overflow-hidden">
                      {img.imageUrl ? (
                        <img
                          src={img.imageUrl}
                          alt={`${data.creatorName} photo ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand-surface/30 text-xs text-brand-muted">NO IMAGE</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Explore Next Girl — 8 random images (no carousel), click → creator page */}
          <section>
            <div className="text-xs tracking-luxe text-brand-muted mb-3">EXPLORE NEXT GIRL</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {exploreCreators.map((c) => (
                <Link
                  key={c.uuid}
                  to={`/creator/preview/${c.slug || c.uuid}`}
                  className="group aspect-[9/16] overflow-hidden rounded-xl border border-brand-line bg-brand-surface/50"
                >
                  <img
                    src={`${c.imageUrl}?w=240`}
                    alt={`${c.displayName} profile photo`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                  />
                </Link>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* BOTTOM ad — home-8 (landscape), full container width */}
      <section>
        <div className="w-full">
          <AdSlot slot="home-8" aspect="4/1" />
        </div>
      </section>

      {/* Lightbox popup — image fills 95vw / 95vh; only the close button has
          a small absolute offset, so padding doesn't crop the photo. */}
      {lightboxImage ? (
        <div
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-3 right-3 z-10 rounded-full border border-white/30 bg-black/60 px-4 py-2 text-white text-sm hover:border-white"
            aria-label="Close photo"
          >
            CLOSE ✕
          </button>
          <img
            src={lightboxImage}
            alt={data.creatorName}
            className="max-h-[95vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
