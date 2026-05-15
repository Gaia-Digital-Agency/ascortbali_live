import { useCallback, useEffect, useRef, useState } from "react";
import {
  TRAVEL_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  BUST_TYPE_OPTIONS,
  PUBIC_HAIR_OPTIONS,
  SERVICE_AREA_OPTIONS,
  CATEGORY_OPTIONS,
  ORIENTATION_OPTIONS,
  SERVICES_OPTIONS,
} from "../lib/creatorOptions";
import { Link, useLocation } from "react-router-dom";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PasswordInput } from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";
import { AdminTabs } from "../components/AdminTabs";

type Me = { username: string; role: string };
type AdminStats = { creatorCount: number; userCount: number };
type UserAccount = { id: string; username: string; password: string; created_at: string; updated_at: string; verified: boolean };
type CreatorAccount = { id: string; username: string; password: string | null; temp_password: string | null; last_seen: string | null; created_at: string; updated_at: string; is_active: boolean; verified: boolean };
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

const APP_BASE_PATH = "";

const defaultAds: AdSpace[] = [
  { slot: "home-1", image: "/api/uploads/baligirls/ads/unique.png", text: null, link_url: "https://lightcyan-horse-210187.hostingersite.com/" },
  { slot: "home-2", image: "/api/uploads/baligirls/ads/humapedia.png", text: null, link_url: "https://www.humanspedia.com/" },
  { slot: "home-3", image: null, text: null, link_url: "https://www.baligirls.com/" },
  { slot: "home-4", image: null, text: null, link_url: null },
  { slot: "home-5", image: null, text: null, link_url: null },
  { slot: "home-6", image: null, text: null, link_url: null },
  { slot: "home-7", image: null, text: null, link_url: null },
  { slot: "home-8", image: null, text: null, link_url: null },
  { slot: "home-9",  image: null, text: null, link_url: null },
  { slot: "home-10", image: null, text: null, link_url: null },
  { slot: "home-11", image: null, text: null, link_url: null },
  { slot: "home-12", image: null, text: null, link_url: null },
  { slot: "home-13", image: null, text: null, link_url: null },
  { slot: "home-14", image: null, text: null, link_url: null },
  { slot: "home-15", image: null, text: null, link_url: null },
  { slot: "home-16", image: null, text: null, link_url: null },
  { slot: "home-17", image: null, text: null, link_url: null },
  { slot: "home-18", image: null, text: null, link_url: null },
  { slot: "home-19", image: null, text: null, link_url: null },
  { slot: "home-20", image: null, text: null, link_url: null },
  { slot: "bottom",  image: null, text: "Your Ads Here", link_url: null },
];

function normalizeAdImage(image: string | null) {
  const raw = (image ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/api/")) return raw;
  return raw;
}

function toStoredImage(image: string | null) {
  const raw = (image ?? "").trim();
  if (!raw) return null;
  return raw;
}

function normalizeAdSpace(ad: AdSpace): AdSpace {
  return { ...ad, image: normalizeAdImage(ad.image) };
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
  } catch { return iso; }
}

// ── Edit-popup field-control map ──
// For each DB key, render a dropdown of valid values instead of free text.
// Fields not listed fall through to the default <input>.
const FIELD_OPTIONS: Record<string, string[]> = {
  // creator fields
  gender:        ["female", "male", "transgender"],
  escort_type:   CATEGORY_OPTIONS,
  form:          CATEGORY_OPTIONS,
  orientation:   ORIENTATION_OPTIONS,
  available_for: ["incall", "outcall", "both"],
  meeting_with:  ["men", "women", "couples", "all"],
  smoker:        ["yes", "no"],
  tattoo:        ["yes", "no"],
  piercing:      ["yes", "no"],
  eyes:          ["Brown", "Dark Brown", "Black", "Hazel", "Blue", "Green", "Gray"],
  hair_color:    ["Black", "Dark Brown", "Brown", "Light Brown", "Blonde", "Red", "Auburn"],
  hair_length:   HAIR_LENGTH_OPTIONS,
  bust_type:     BUST_TYPE_OPTIONS,
  pubic_hair:    PUBIC_HAIR_OPTIONS,
  ethnicity:     ["Asian", "West European", "Eastern European", "African", "Australian", "North American", "South American", "Black", "Caucasian", "Middle Eastern", "Hispanic", "Latin", "Pacific Islander", "Mixed", "Other"],
  city:          SERVICE_AREA_OPTIONS,
  travel:        TRAVEL_OPTIONS,
  // user fields
  age_group:           ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
  preferred_contact:   ["whatsapp", "telegram", "wechat"],
  relationship_status: ["single", "married", "other"],
};
const TEXTAREA_FIELDS = new Set(["notes", "languages"]);

// Override the default snake_case → UPPER label for fields we've renamed
// on the public profile / creator editor. Keep in sync with those files.
const LABEL_OVERRIDES: Record<string, string> = {
  available_for: "INCALL/OUTCALL",
  meeting_with:  "MEET MEN/WOMEN/COUPLES",
  notes:         "ABOUT ME",
  temp_password: "TEMP PASSWORD",
  wechat_id:     "WECHAT ID",
  telegram_id:   "TELEGRAM ID",
  phone_number:  "PHONE / SMS",
  cell_phone:    "WHATSAPP",
  model_name:    "DISPLAY NAME",
  escort_type:   "CATEGORY",
  is_active:     "ACTIVE",
  body_votes:    "BODY VOTES",
  face_votes:    "FACE VOTES",
};

export default function AdminDashboard() {
  // Sub-route ("dashboard" | "ads" | "creators" | "users") selects which
  // section of the page to render. All state remains in this component so
  // the View/Edit modal and shared loaders work identically across tabs.
  const location = useLocation();
  const sub = (() => {
    const p = location.pathname.replace(/\/$/, "");
    if (p.endsWith("/ads")) return "ads" as const;
    if (p.endsWith("/stats")) return "stats" as const;
    if (p.endsWith("/creators")) return "creators" as const;
    if (p.endsWith("/users")) return "users" as const;
    return "dashboard" as const;
  })();
  const sectionTitle =
    sub === "ads" ? "ADS MANAGEMENT"
    : sub === "stats" ? "STATS / ANALYTICS"
    : sub === "creators" ? "CREATOR MANAGEMENT"
    : sub === "users" ? "USER MANAGEMENT"
    : "ADMIN CMS PAGE";

  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ads, setAds] = useState<AdSpace[]>(defaultAds);
  const [savedAds, setSavedAds] = useState<AdSpace[]>(defaultAds);
  // ── Dashboard metrics ──
  type Metrics = {
    visitors_by_window: Record<string, number>;
    page_views_by_window: Record<string, number>;
    regions: Array<{ region: string; visitors: number }>;
    top_creators_7d: Array<{ uuid: string; model_name: string; slug: string; views: number }>;
    devices: Array<{ device: string; n: number }>;
    new_vs_returning: Array<{ kind: string; n: number }>;
    bounce: Array<{ kind: string; n: number }>;
    voting: { body_total: number; face_total: number; voters: number } | null;
  };
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [creators, setCreators] = useState<CreatorAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [savingAllAds, setSavingAllAds] = useState(false);
  const [adsMsg, setAdsMsg] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState("Admin@123");
  const [pwNew, setPwNew] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  const [tagline, setTagline] = useState("Meet your girl for free and ...");
  // Header subtitle (under "BALI GIRLS") — separate setting from the
  // homepage H2 tagline so they can be edited independently.
  const [subtitle, setSubtitle] = useState("");
  const [featuredGirls, setFeaturedGirls] = useState<string[]>(["", "", "", "", "", "", ""]);
  const [creatorNames, setCreatorNames] = useState<{ id: string; model_name: string }[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const [viewType, setViewType] = useState<"user" | "creator" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<Record<string, string | number | boolean | null> | null>(null);
  const [viewEditing, setViewEditing] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiFetch("/me");
        if (profile.role !== "admin") {
          clearTokens();
          window.location.href = withBasePath("/admin");
          return;
        }
        setMe(profile);
        const [statsData, adsData, accountsData] = await Promise.all([
          apiFetch("/admin/stats"),
          apiFetch("/admin/ads"),
          apiFetch("/admin/accounts"),
        ]);
        setStats(statsData);
        if (Array.isArray(adsData) && adsData.length) {
          const normalized = adsData.map(normalizeAdSpace);
          setAds(normalized);
          setSavedAds(normalized);
        }
        if (accountsData?.users) setUsers(accountsData.users);
        try {
          const m = await apiFetch("/admin/metrics");
          if (m) setMetrics(m);
        } catch { /* metrics non-critical */ }
        if (accountsData?.creators) setCreators(accountsData.creators);

        const [settingsData, namesData] = await Promise.all([
          apiFetch("/admin/settings"),
          apiFetch("/admin/creator-names"),
        ]);
        if (settingsData?.tagline) setTagline(settingsData.tagline);
        // Subtitle falls back to tagline on first load (before the operator
        // has filled it in for the first time) so the header doesn't go blank.
        if (settingsData?.subtitle != null) setSubtitle(settingsData.subtitle);
        else if (settingsData?.tagline) setSubtitle(settingsData.tagline);
        setFeaturedGirls([
          settingsData?.featured_girl_1 || "",
          settingsData?.featured_girl_2 || "",
          settingsData?.featured_girl_3 || "",
          settingsData?.featured_girl_4 || "",
        ]);
        if (Array.isArray(namesData)) setCreatorNames(namesData);
      } catch {
        clearTokens();
        window.location.href = withBasePath("/admin");
      }
    })();
  }, []);

  const updateAd = (slot: AdSpace["slot"], patch: Partial<AdSpace>) => {
    setAds((prev) => prev.map((ad) => (ad.slot === slot ? { ...ad, ...patch } : ad)));
  };

  // Local-only clear. Persisted only when user clicks "SAVE ALL ADS".
  const clearSlot = (slot: AdSpace["slot"]) => {
    if (slot === "bottom") {
      updateAd("bottom", { text: "Your Ads Here" });
    } else {
      updateAd(slot, { image: null, link_url: null });
    }
    setAdsMsg(null);
  };

  // Compute dirty flag by deep-comparing ads vs savedAds.
  const isAdsDirty = (() => {
    if (ads.length !== savedAds.length) return true;
    for (const ad of ads) {
      const prev = savedAds.find((s) => s.slot === ad.slot);
      if (!prev) return true;
      if ((ad.image ?? null) !== (prev.image ?? null)) return true;
      if ((ad.link_url ?? null) !== (prev.link_url ?? null)) return true;
      if ((ad.text ?? null) !== (prev.text ?? null)) return true;
    }
    return false;
  })();

  // Persist ALL ad slots in one go. Compares against savedAds and only
  // PUTs/DELETEs slots that actually changed.
  const saveAllAds = async () => {
    setSavingAllAds(true);
    setAdsMsg(null);
    setError(null);
    try {
      const tasks: Promise<unknown>[] = [];
      for (const ad of ads) {
        const prev = savedAds.find((s) => s.slot === ad.slot);
        const changed =
          !prev ||
          (prev.image ?? null) !== (ad.image ?? null) ||
          (prev.link_url ?? null) !== (ad.link_url ?? null) ||
          (prev.text ?? null) !== (ad.text ?? null);
        if (!changed) continue;

        const imageNow = ad.slot === "bottom" ? null : toStoredImage(ad.image);
        const linkNow = ad.slot === "bottom" ? null : (ad.link_url?.trim() || null);
        const textNow = ad.slot === "bottom" ? ad.text : null;

        // If everything is empty → DELETE the slot.
        if (!imageNow && !linkNow && !textNow) {
          tasks.push(apiFetch(`/admin/ads/${ad.slot}`, { method: "DELETE" }));
        } else {
          tasks.push(
            apiFetch(`/admin/ads/${ad.slot}`, {
              method: "PUT",
              body: JSON.stringify({ image: imageNow, text: textNow, link_url: linkNow }),
            })
          );
        }
      }
      await Promise.all(tasks);
      setSavedAds(ads);
      setAdsMsg(tasks.length === 0 ? "No changes to save." : `Saved ${tasks.length} ad slot${tasks.length === 1 ? "" : "s"}.`);
    } catch (err: any) {
      setError(err.message ?? "Failed to save ads.");
    } finally {
      setSavingAllAds(false);
    }
  };

  const logout = useCallback(() => {
    clearTokens();
    window.location.assign(withBasePath("/"));
  }, []);

  const changePassword = async () => {
    setPwSaving(true);
    setPwMsg(null);
    setError(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      setPwMsg("Password updated.");
      setPwNew("");
    } catch (err: any) {
      setError(err.message ?? "Password change failed");
    } finally {
      setPwSaving(false);
    }
  };

  const toggleVerified = async (type: "user" | "creator", id: string, current: boolean) => {
    const next = !current;
    try {
      await apiFetch(`/admin/accounts/${type}s/${id}`, {
        method: "PUT",
        body: JSON.stringify({ verified: next }),
      });
      if (type === "user") {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verified: next } : u));
      } else {
        setCreators((prev) => prev.map((c) => c.id === id ? { ...c, verified: next } : c));
      }
    } catch {
      setAccountMsg("Failed to update verified status.");
    }
  };

  const openView = async (type: "user" | "creator", id: string) => {
    setViewType(type); setViewId(id); setViewEditing(false); setViewLoading(true); setError(null);
    try {
      const data = await apiFetch(`/admin/accounts/${type}s/${id}`);
      setViewData(data);
    } catch (err: any) { setError(err.message ?? "Failed to load details"); setViewType(null); }
    finally { setViewLoading(false); }
  };
  const closeView = () => { setViewType(null); setViewId(null); setViewData(null); setViewEditing(false); };
  const saveView = async () => {
    if (!viewType || !viewId || !viewData) return;
    setViewSaving(true); setError(null); setAccountMsg(null);
    try {
      const skip = new Set(["id", "created_at", "updated_at"]);
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(viewData)) { if (!skip.has(k)) payload[k] = v; }
      await apiFetch(`/admin/accounts/${viewType}s/${viewId}`, { method: "PUT", body: JSON.stringify(payload) });
      const accountsData = await apiFetch("/admin/accounts");
      if (accountsData?.users) setUsers(accountsData.users);
      if (accountsData?.creators) setCreators(accountsData.creators);
      setAccountMsg(`${viewType === "user" ? "User" : "Creator"} updated.`);
      closeView();
    } catch (err: any) { setError(err.message ?? "Save failed"); }
    finally { setViewSaving(false); }
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteFromView = async () => {
    if (!viewType || !viewId) return;
    setViewSaving(true); setError(null); setAccountMsg(null);
    try {
      if (viewType === "creator") {
        await apiFetch(`/admin/accounts/creators/${viewId}`, { method: "PUT", body: JSON.stringify({ is_active: false }) });
        setCreators((prev) => prev.map((c) => c.id === viewId ? { ...c, is_active: false } : c));
        setAccountMsg("Creator deactivated (soft deleted).");
      } else {
        await apiFetch(`/admin/accounts/${viewType}s/${viewId}`, { method: "DELETE" });
        setUsers((prev) => prev.filter((u) => u.id !== viewId));
        setStats((prev) => prev ? { ...prev, userCount: prev.userCount - 1 } : prev);
        setAccountMsg("User deleted.");
      }
      setShowDeleteConfirm(false);
      closeView();
    } catch (err: any) { setError(err.message ?? "Delete failed"); }
    finally { setViewSaving(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageMeta
        title={"Admin — Bali Girls"}
        description={"Bali Girls admin dashboard."}
        path={"/admin/logged"}
        index={false}
      />
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs tracking-luxe text-brand-muted">ADMIN</div>
          <h1 className="mt-2 font-display text-3xl">{sectionTitle}</h1>
          <p className="mt-2 text-sm text-brand-muted">{me ? `Signed in as ${me.username}` : "Loading..."}</p>
          {error ? <div className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div> : null}
          {accountMsg ? <div className="mt-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{accountMsg}</div> : null}
        </div>
        <div className="flex gap-3">
          <Link className="btn btn-outline" to="/">BACK HOME</Link>
          <button onClick={logout} className="btn btn-outline">LOGOUT</button>
        </div>
      </div>

      {sub === "dashboard" && (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTERED CREATORS</div>
          <div className="mt-4 font-display text-3xl text-brand-text">{stats?.creatorCount ?? "—"}</div>
        </div>
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTERED USERS</div>
          <div className="mt-4 font-display text-3xl text-brand-text">{stats?.userCount ?? "—"}</div>
        </div>
      </div>
      )}

      {sub === "stats" && (
      <>
      {/* ── METRICS ── */}
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">VISITORS</div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["today","7d","30d","all"] as const).map((w) => (
            <div key={w} className="rounded-2xl border border-brand-line bg-brand-surface2/40 p-4">
              <div className="text-[10px] tracking-[0.18em] text-brand-muted">{w.toUpperCase()}</div>
              <div className="mt-1 font-display text-2xl text-brand-text">{metrics?.visitors_by_window?.[w] ?? "—"}</div>
              <div className="mt-1 text-[10px] text-brand-muted/70">{metrics?.page_views_by_window?.[w] ?? "—"} page views</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">REGIONS (UNIQUE VISITORS)</div>
          <div className="mt-3 space-y-2">
            {(metrics?.regions ?? []).map((r) => {
              const max = Math.max(1, ...(metrics?.regions ?? []).map((x) => x.visitors));
              const pct = Math.round((r.visitors / max) * 100);
              return (
                <div key={r.region} className="text-xs">
                  <div className="flex items-center justify-between text-brand-muted">
                    <span>{r.region}</span><span className="text-brand-text">{r.visitors}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-brand-surface2/60">
                    <div className="h-1.5 rounded-full bg-brand-gold" style={{ width: pct + "%" }} />
                  </div>
                </div>
              );
            })}
            {!metrics?.regions?.length && <div className="text-xs text-brand-muted">No visitor data yet.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">TOP CREATORS (7 DAYS)</div>
          <div className="mt-3 space-y-1.5 text-xs">
            {(metrics?.top_creators_7d ?? []).map((c, i) => (
              <div key={c.uuid} className="flex items-center justify-between border-b border-brand-line/40 pb-1">
                <span className="text-brand-muted">{i + 1}. {c.model_name}</span>
                <span className="text-brand-text">{c.views} views</span>
              </div>
            ))}
            {!metrics?.top_creators_7d?.length && <div className="text-brand-muted">Not enough data yet.</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">DEVICE SPLIT</div>
          <div className="mt-3 space-y-1 text-xs">
            {(metrics?.devices ?? []).map((d) => (
              <div key={d.device} className="flex items-center justify-between">
                <span className="text-brand-muted capitalize">{d.device}</span><span className="text-brand-text">{d.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">NEW vs RETURNING</div>
          <div className="mt-3 space-y-1 text-xs">
            {(metrics?.new_vs_returning ?? []).map((r) => (
              <div key={r.kind} className="flex items-center justify-between">
                <span className="text-brand-muted capitalize">{r.kind}</span><span className="text-brand-text">{r.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">VOTES</div>
          <div className="mt-3 space-y-1 text-xs text-brand-muted">
            <div>Body total: <span className="text-brand-text">{metrics?.voting?.body_total ?? 0}</span></div>
            <div>Face total: <span className="text-brand-text">{metrics?.voting?.face_total ?? 0}</span></div>
            <div>Unique voters: <span className="text-brand-text">{metrics?.voting?.voters ?? 0}</span></div>
          </div>
        </div>
      </div>
      </>
      )}

      {sub === "ads" && (
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
              onClick={saveAllAds}
              disabled={savingAllAds || !isAdsDirty}
              className="btn btn-primary px-4 py-2 text-xs"
            >
              {savingAllAds ? "SAVING..." : "SAVE ALL ADS"}
            </button>
          </div>
        </div>
        {/* Slot cards grouped by page so the operator sees at a glance which
            ads belong to the Homepage vs the Creator Page. Each card also
            shows its individual placement description (see ImageAdEditor). */}
        {/* Each page section renders three explicit rows so the layout
            matches the operator's mental model:
              line 1 = landscape leaderboards (2 cards)
              line 2 = portrait side rails    (4 cards)
              line 3 = card-area first row    (4 cards)
            Each row keeps the same card width (1/4 of the row on md+) so
            the landscape row visually shows two wider cells beside two
            empty slots — but mobile collapses everything to 2 cols. */}
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
                          onChange={(image) => { updateAd(slot, { image }); setAdsMsg(null); }}
                          onChangeLinkUrl={(link_url) => { updateAd(slot, { link_url }); setAdsMsg(null); }}
                          onClear={() => clearSlot(slot)}
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
            onClick={saveAllAds}
            disabled={savingAllAds || !isAdsDirty}
            className="btn btn-primary px-5 py-2.5 text-xs"
          >
            {savingAllAds ? "SAVING..." : "SAVE ALL ADS"}
          </button>
        </div>
      </div>
      )}

      {sub === "dashboard" && (
      <>
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">HEADER SUBTITLE</div>
        <p className="mt-1 text-[11px] text-brand-muted/70">Shown under the "BALI GIRLS" title in the site header.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Free, Real, Simple"
          />
          <button
            type="button"
            disabled={savingSettings}
            onClick={async () => {
              setSavingSettings(true); setSettingsMsg(null); setError(null);
              try {
                await apiFetch("/admin/settings/subtitle", { method: "PUT", body: JSON.stringify({ value: subtitle }) });
                setSettingsMsg("Header subtitle saved.");
              } catch { setError("Failed to save header subtitle."); }
              finally { setSavingSettings(false); }
            }}
            className="btn btn-primary py-3"
          >
            {savingSettings ? "SAVING..." : "SAVE"}
          </button>
        </div>

        <div className="mt-6 text-xs tracking-[0.22em] text-brand-muted">HOMEPAGE TAGLINE</div>
        <p className="mt-1 text-[11px] text-brand-muted/70">Shown as the large H2 heading on the homepage.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Your Free Access to Bali Girls Across the Island"
          />
          <button
            type="button"
            disabled={savingSettings}
            onClick={async () => {
              setSavingSettings(true); setSettingsMsg(null); setError(null);
              try {
                await apiFetch("/admin/settings/tagline", { method: "PUT", body: JSON.stringify({ value: tagline }) });
                setSettingsMsg("Tagline saved.");
              } catch { setError("Failed to save tagline."); }
              finally { setSavingSettings(false); }
            }}
            className="btn btn-primary py-3"
          >
            {savingSettings ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">FEATURED GIRLS (CAROUSEL)</div>
        <p className="mt-2 text-xs text-brand-muted">Select 4 active creators for the featured girls carousel on the homepage.</p>
        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          {([0, 1, 2, 3] as const).map((idx) => (
            <div key={idx}>
              <div className="text-[10px] tracking-[0.18em] text-brand-muted">GIRL {idx + 1}</div>
              <select
                className="mt-1 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
                value={featuredGirls[idx]}
                onChange={(e) => setFeaturedGirls((prev) => { const next = [...prev] as string[]; next[idx] = e.target.value; return next; })}
              >
                <option value="">— None —</option>
                {creatorNames.map((c) => (
                  <option key={c.id} value={c.model_name}>{c.model_name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={savingSettings}
            onClick={async () => {
              setSavingSettings(true); setSettingsMsg(null); setError(null);
              try {
                await Promise.all(
                  featuredGirls.map((name, i) =>
                    apiFetch(`/admin/settings/featured_girl_${i + 1}`, { method: "PUT", body: JSON.stringify({ value: name }) })
                  )
                );
                setSettingsMsg("Featured girls saved.");
              } catch { setError("Failed to save featured girls."); }
              finally { setSavingSettings(false); }
            }}
            className="btn btn-primary py-3"
          >
            {savingSettings ? "SAVING..." : "SAVE FEATURED GIRLS"}
          </button>
          {settingsMsg ? <span className="text-xs text-emerald-400">{settingsMsg}</span> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">CHANGE PASSWORD</div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <PasswordInput value={pwCurrent} onChange={setPwCurrent} placeholder="Current password" visible={showPwCurrent} onToggleVisibility={() => setShowPwCurrent((prev) => !prev)} />
          <PasswordInput value={pwNew} onChange={setPwNew} placeholder="New password" visible={showPwNew} onToggleVisibility={() => setShowPwNew((prev) => !prev)} />
          <button onClick={changePassword} disabled={pwSaving || !pwNew.trim()} className="btn btn-primary py-3">
            {pwSaving ? "SAVING..." : "UPDATE"}
          </button>
        </div>
        {pwMsg ? <div className="mt-4 text-xs text-emerald-400">{pwMsg}</div> : null}
      </div>
      </>
      )}

      {sub === "users" && (
      /* Users list */
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTERED USERS ({users.length})</div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-line text-left text-xs tracking-[0.18em] text-brand-muted">
                <th className="pb-3 pr-4 font-normal">USERNAME</th>
                <th className="pb-3 pr-4 font-normal">VERIFIED</th>
                <th className="pb-3 pr-4 font-normal">REGISTERED</th>
                <th className="pb-3 font-normal">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-xs text-brand-muted">No users yet.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-brand-line/40 last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs">{u.username}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => toggleVerified("user", u.id, u.verified)}
                      title={u.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                      aria-label={u.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                      className={`h-5 w-5 rounded-full border-2 transition ${u.verified ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-transparent border-brand-muted/60 hover:border-brand-muted"}`}
                    />
                  </td>
                  <td className="py-3 pr-4 text-xs text-brand-muted">{fmtDate(u.created_at)}</td>
                  <td className="py-3">
                    <button onClick={() => openView("user", u.id)} className="btn btn-outline px-3 py-1.5 text-xs">VIEW</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {sub === "creators" && (
      /* Creators list */
      (() => {
        const active = creators.filter((c) => c.is_active);
        const inactive = creators.filter((c) => !c.is_active);
        const renderCreatorTable = (list: CreatorAccount[], emptyMsg: string) => (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-xs tracking-[0.18em] text-brand-muted">
                  <th className="pb-3 pr-4 font-normal">USERNAME</th>
                  <th className="pb-3 pr-4 font-normal">VERIFIED</th>
                  <th className="pb-3 pr-4 font-normal">LAST SEEN</th>
                  <th className="pb-3 pr-4 font-normal">REGISTERED</th>
                  <th className="pb-3 font-normal">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 text-xs text-brand-muted">{emptyMsg}</td></tr>
                ) : list.map((c) => (
                  <tr key={c.id} className="border-b border-brand-line/40 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{c.username || "—"}</td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => toggleVerified("creator", c.id, c.verified)}
                        title={c.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                        aria-label={c.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                        className={`h-5 w-5 rounded-full border-2 transition ${c.verified ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-transparent border-brand-muted/60 hover:border-brand-muted"}`}
                      />
                    </td>
                    <td className="py-3 pr-4 text-xs text-brand-muted">{c.last_seen || "—"}</td>
                    <td className="py-3 pr-4 text-xs text-brand-muted">{fmtDate(c.created_at)}</td>
                    <td className="py-3">
                      <button onClick={() => openView("creator", c.id)} className="btn btn-outline px-3 py-1.5 text-xs">VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return (
          <>
            <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
              <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-brand-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                ACTIVE CREATORS ({active.length})
              </div>
              {renderCreatorTable(active, "No active creators.")}
            </div>
            <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
              <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-brand-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-muted/40" />
                INACTIVE CREATORS ({inactive.length})
              </div>
              {renderCreatorTable(inactive, "No inactive creators.")}
            </div>
          </>
        );
      })()
      )}


      {/* View / Edit / Delete popup */}
      {viewType && viewData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10">
          <div className="w-full max-w-2xl rounded-3xl border border-brand-line bg-brand-bg p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-brand-text">
                {viewEditing ? "Edit" : "View"} {viewType === "user" ? "User" : "Creator"}
              </h2>
              <button onClick={closeView} className="btn btn-outline px-4 py-1.5 text-xs text-white border-white/40 hover:border-white">CLOSE</button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {Object.entries(viewData).map(([key, val]) => {
                const readOnly = ["id", "provider_id", "slug", "url", "created_at", "updated_at"].includes(key);
                const label = LABEL_OVERRIDES[key] ?? key.replace(/_/g, " ").toUpperCase();
                return (
                  <div key={key}>
                    <div className="text-[10px] tracking-[0.18em] text-brand-muted">{label}</div>
                    {viewEditing && !readOnly ? (
                      (key === "body_votes" || key === "face_votes") ? (
                        <div className="mt-1 rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs">
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(val as Record<string, number>).map(([opt, count]) => (
                              <div key={opt}>
                                <div className="text-[10px] text-brand-muted capitalize">{opt}</div>
                                <input
                                  type="number"
                                  min={0}
                                  className="mt-1 w-full rounded-lg border border-brand-line bg-brand-bg/40 px-2 py-1 text-xs outline-none focus:border-brand-gold/60"
                                  value={count}
                                  onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: { ...(prev[key] as Record<string, number>), [opt]: Math.max(0, parseInt(e.target.value || "0", 10)) } } : prev)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : key === "verified" ? (
                        <div className="mt-1 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewData((prev) => prev ? { ...prev, verified: !prev.verified } : prev)}
                            title={val ? "Verified — click to unverify" : "Not verified — click to verify"}
                            aria-label={val ? "Verified — click to unverify" : "Not verified — click to verify"}
                            className={`h-5 w-5 rounded-full border-2 transition ${val ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-transparent border-brand-muted/60 hover:border-brand-muted"}`}
                          />
                          <span className="text-xs text-brand-muted">{val ? "Verified" : "Not verified"}</span>
                        </div>
                      ) : typeof val === "boolean" ? (
                        <select
                          className="mt-1 w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs outline-none focus:border-brand-gold/60"
                          value={String(val)}
                          onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: e.target.value === "true" } : prev)}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : FIELD_OPTIONS[key] ? (
                        <select
                          className="mt-1 w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs outline-none focus:border-brand-gold/60"
                          value={String(val ?? "")}
                          onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                        >
                          <option value="">— select —</option>
                          {/* If the stored value isn't in the canonical list, keep it as a one-off option so the admin doesn't accidentally wipe it. */}
                          {val && !FIELD_OPTIONS[key].includes(String(val)) && (
                            <option value={String(val)}>{String(val)} (current)</option>
                          )}
                          {FIELD_OPTIONS[key].map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : key === "services" ? (
                        <div className="mt-1 rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs">
                          {/* Services: stored as comma-separated string. Multi-select checkboxes mirror the registration page. */}
                          {(() => {
                            const current = String(val ?? "").split(",").map((v) => v.trim()).filter(Boolean);
                            return (
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {SERVICES_OPTIONS.map((opt) => {
                                  const checked = current.includes(opt);
                                  return (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = e.target.checked
                                            ? Array.from(new Set([...current, opt]))
                                            : current.filter((v) => v !== opt);
                                          setViewData((prev) => prev ? { ...prev, [key]: next.join(", ") } : prev);
                                        }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      ) : TEXTAREA_FIELDS.has(key) ? (
                        <textarea
                          className="mt-1 min-h-[80px] w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs outline-none focus:border-brand-gold/60"
                          value={String(val ?? "")}
                          onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                        />
                      ) : (
                        <input
                          className="mt-1 w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs outline-none focus:border-brand-gold/60"
                          value={String(val ?? "")}
                          onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                        />
                      )
                    ) : (key === "body_votes" || key === "face_votes") ? (
                      <div className="mt-1 rounded-xl border border-brand-line/40 bg-brand-surface2/20 px-3 py-2 text-xs text-brand-muted">
                        {Object.entries((val as Record<string, number>) ?? {}).map(([opt, count]) => (
                          <span key={opt} className="mr-3 inline-block">
                            <span className="capitalize">{opt}</span>: <span className="text-brand-text">{count}</span>
                          </span>
                        ))}
                      </div>
                    ) : key === "verified" ? (
                      <div className="mt-1 flex items-center gap-3">
                        <span className={`inline-block h-5 w-5 rounded-full border-2 ${val ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-transparent border-brand-muted/60"}`} />
                        <span className="text-xs text-brand-muted">{val ? "Verified" : "Not verified"}</span>
                      </div>
                    ) : (
                      <div className="mt-1 rounded-xl border border-brand-line/40 bg-brand-surface2/20 px-3 py-2 text-xs text-brand-muted">
                        {val === null || val === "" ? "—" : typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-2">
              {viewEditing ? (
                <>
                  <button onClick={saveView} disabled={viewSaving} className="btn btn-primary px-4 py-2 text-xs">
                    {viewSaving ? "SAVING..." : "SAVE"}
                  </button>
                  <button onClick={() => setViewEditing(false)} disabled={viewSaving} className="btn btn-outline px-4 py-2 text-xs">
                    CANCEL
                  </button>
                </>
              ) : (
                <button onClick={() => setViewEditing(true)} className="btn btn-primary px-4 py-2 text-xs">
                  EDIT
                </button>
              )}
              {showDeleteConfirm ? (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-red-400">Are you sure?</span>
                  <button onClick={deleteFromView} disabled={viewSaving} className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30">
                    {viewSaving ? "..." : "YES, DELETE"}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={viewSaving} className="btn btn-outline px-3 py-1.5 text-xs">
                    CANCEL
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="ml-auto px-4 py-2 text-xs text-red-400/60 hover:text-red-400">
                  DELETE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {viewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="text-sm text-brand-muted">Loading...</div>
        </div>
      )}
    </div>
  );
}

function ImageAdEditor({
  slot, image, busy, dirty, linkUrl, onChange, onChangeLinkUrl, onClear,
}: {
  slot:
    | "home-1" | "home-2" | "home-3" | "home-4"
    | "home-5" | "home-6" | "home-7" | "home-8"
    | "home-9" | "home-10" | "home-11" | "home-12"
    | "home-13" | "home-14" | "home-15" | "home-16"
    | "home-17" | "home-18" | "home-19" | "home-20";
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
  const placement: Record<typeof slot, string> = {
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
          {/* Placement guide — kept brand-toned + slightly larger so the
              operator can scan it without squinting. */}
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
            // Surface the error inline instead of silently swallowing it,
            // so a failed upload can be diagnosed without the dev tools.
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
