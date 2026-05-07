import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PasswordInput } from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";

type Me = { username: string; role: string };
type AdminStats = { creatorCount: number; userCount: number };
type UserAccount = { id: string; username: string; password: string; created_at: string; updated_at: string };
type CreatorAccount = { id: string; username: string; password: string | null; temp_password: string | null; last_seen: string | null; created_at: string; updated_at: string; is_active: boolean };
type AdSpace = {
  slot: "home-1" | "home-2" | "home-3" | "home-4" | "home-5" | "home-6" | "home-7" | "home-8" | "bottom";
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
  { slot: "bottom", image: null, text: "Your Ads Here", link_url: null },
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

export default function AdminDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ads, setAds] = useState<AdSpace[]>(defaultAds);
  const [savedAds, setSavedAds] = useState<AdSpace[]>(defaultAds);
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
        if (accountsData?.creators) setCreators(accountsData.creators);

        const [settingsData, namesData] = await Promise.all([
          apiFetch("/admin/settings"),
          apiFetch("/admin/creator-names"),
        ]);
        if (settingsData?.tagline) setTagline(settingsData.tagline);
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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs tracking-luxe text-brand-muted">ADMIN</div>
          <h1 className="mt-2 font-display text-3xl">ADMIN CMS PAGE</h1>
          <p className="mt-2 text-sm text-brand-muted">{me ? `Signed in as ${me.username}` : "Loading..."}</p>
          {error ? <div className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div> : null}
          {accountMsg ? <div className="mt-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{accountMsg}</div> : null}
        </div>
        <div className="flex gap-3">
          <Link className="btn btn-outline" to="/">BACK HOME</Link>
          <button onClick={logout} className="btn btn-outline">LOGOUT</button>
        </div>
      </div>

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
        <div className="mt-6 grid gap-5 grid-cols-2 md:grid-cols-4">
          {(["home-1", "home-2", "home-3", "home-4", "home-5", "home-6", "home-7", "home-8"] as const).map((slot) => {
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

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">HOMEPAGE TAGLINE</div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Meet your girl for free and ..."
          />
          <button
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

      {/* Users list */}
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTERED USERS ({users.length})</div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-line text-left text-xs tracking-[0.18em] text-brand-muted">
                <th className="pb-3 pr-4 font-normal">USERNAME</th>
                <th className="pb-3 pr-4 font-normal">REGISTERED</th>
                <th className="pb-3 font-normal">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} className="py-4 text-xs text-brand-muted">No users yet.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-brand-line/40 last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs">{u.username}</td>
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

      {/* Creators list */}
      {(() => {
        const active = creators.filter((c) => c.is_active);
        const inactive = creators.filter((c) => !c.is_active);
        const renderCreatorTable = (list: CreatorAccount[], emptyMsg: string) => (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-xs tracking-[0.18em] text-brand-muted">
                  <th className="pb-3 pr-4 font-normal">USERNAME</th>
                  <th className="pb-3 pr-4 font-normal">LAST SEEN</th>
                  <th className="pb-3 pr-4 font-normal">REGISTERED</th>
                  <th className="pb-3 font-normal">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-xs text-brand-muted">{emptyMsg}</td></tr>
                ) : list.map((c) => (
                  <tr key={c.id} className="border-b border-brand-line/40 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{c.username || "—"}</td>
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
      })()}

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
                const readOnly = ["id", "created_at", "updated_at"].includes(key);
                const label = key.replace(/_/g, " ").toUpperCase();
                return (
                  <div key={key}>
                    <div className="text-[10px] tracking-[0.18em] text-brand-muted">{label}</div>
                    {viewEditing && !readOnly ? (
                      typeof val === "boolean" ? (
                        <select
                          className="mt-1 w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs outline-none focus:border-brand-gold/60"
                          value={String(val)}
                          onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: e.target.value === "true" } : prev)}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          className="mt-1 w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs outline-none focus:border-brand-gold/60"
                          value={String(val ?? "")}
                          onChange={(e) => setViewData((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                        />
                      )
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
  slot: "home-1" | "home-2" | "home-3" | "home-4" | "home-5" | "home-6" | "home-7" | "home-8";
  image: string | null; busy: boolean; dirty: boolean; linkUrl: string | null;
  onChange: (value: string) => void; onChangeLinkUrl: (value: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isLandscape = slot === "home-5" || slot === "home-6" || slot === "home-7" || slot === "home-8";

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
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.22em] text-brand-muted uppercase">
          {isLandscape ? `${slot} (LANDSCAPE)` : `${slot} (PORTRAIT)`}
        </div>
        {dirty ? <span className="text-[9px] text-amber-300 tracking-[0.18em]">UNSAVED</span> : null}
      </div>
      <div className={`${isLandscape ? "aspect-[16/9]" : "aspect-[9/16]"} overflow-hidden rounded-xl border border-brand-line`}>
        {image ? (
          <img src={image} alt={slot} className="h-full w-full object-cover" />
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
        <button onClick={() => fileRef.current?.click()} disabled={busy || uploading} className="btn btn-primary btn-block px-2 py-2 text-[11px]">
          {uploading ? "UPLOADING..." : busy ? "..." : "UPLOAD"}
        </button>
        <button onClick={onClear} disabled={busy || uploading} className="btn btn-outline btn-block px-2 py-2 text-[11px]">
          CLEAR
        </button>
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
          try {
            await upload(file);
          } catch { /* silent */ }
          finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
          }
        }}
      />
    </div>
  );
}
