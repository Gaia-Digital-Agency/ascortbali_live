// Admin page orchestrator. Holds all state + handlers; per-tab UI lives in
// ./admin/*Tab.tsx and the view/edit popup in ./admin/AccountEditModal.tsx.
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";
import { AdminTabs } from "../components/AdminTabs";

import type {
  Me, AdminStats, UserAccount, CreatorAccount, AdSpace, Metrics, ViewData, ViewType,
} from "./admin/types";
import { defaultAds, normalizeAdSpace, toStoredImage } from "./admin/constants";
import { DashboardTab } from "./admin/DashboardTab";
import { StatsTab } from "./admin/StatsTab";
import { AdsTab } from "./admin/AdsTab";
import { UsersTab } from "./admin/UsersTab";
import { CreatorsTab } from "./admin/CreatorsTab";
import { AccountEditModal } from "./admin/AccountEditModal";

export default function AdminDashboard() {
  // Sub-route ("dashboard" | "stats" | "ads" | "creators" | "users") selects
  // which tab to render. All state lives here so the shared modal + loaders
  // behave identically across tabs.
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
    : sub === "creators" ? "GIRLS MANAGEMENT"
    : sub === "users" ? "USER MANAGEMENT"
    : "ADMIN CMS PAGE";

  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ads, setAds] = useState<AdSpace[]>(defaultAds);
  const [savedAds, setSavedAds] = useState<AdSpace[]>(defaultAds);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [creators, setCreators] = useState<CreatorAccount[]>([]);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingSlot] = useState<string | null>(null);
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

  const [viewType, setViewType] = useState<ViewType | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<ViewData | null>(null);
  // Snapshot of viewData at load time. saveView diffs against this so we only
  // PUT the fields the admin actually changed — prevents stale row values
  // (e.g. legacy non-email username, out-of-range age) from re-entering Zod
  // validation and 400-ing the save with invalid_body.
  const [viewOriginal, setViewOriginal] = useState<ViewData | null>(null);
  const [viewEditing, setViewEditing] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
          apiFetch("/admin/accounts?limit=500"),
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
        // Subtitle falls back to tagline on first load so header isn't blank.
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

  // Persist ALL ad slots in one go. Only PUTs/DELETEs slots that changed.
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
        const textNow = ad.slot === "bottom"
          ? ad.text
          : ((ad.text ?? "").trim().slice(0, 50) || null);

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

  const toggleVerified = async (type: ViewType, id: string, current: boolean) => {
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

  // Send one creator their onboarding WhatsApp (initial-login link + temp password).
  const sendOnboarding = async (id: string) => {
    setAccountMsg(null);
    try {
      await apiFetch(`/admin/creators/${id}/send-onboarding`, { method: "POST" });
      setAccountMsg("Onboarding WhatsApp sent.");
    } catch (e) {
      setAccountMsg(`Onboarding send failed: ${e instanceof Error ? e.message : "error"}`);
    }
  };

  // Bulk-send the onboarding WhatsApp to all unverified creators with a phone.
  const sendOnboardingBulk = async () => {
    if (!window.confirm("Send the onboarding WhatsApp to ALL unverified creators with a phone number?")) return;
    setOnboardingBusy(true);
    setAccountMsg(null);
    try {
      const r = await apiFetch<{ total: number; sent: number; failed: number; skipped: number }>(
        `/admin/creators/send-onboarding-bulk`,
        { method: "POST" },
      );
      setAccountMsg(`Onboarding bulk: ${r.sent} sent, ${r.failed} failed, ${r.skipped} skipped (of ${r.total}).`);
    } catch (e) {
      setAccountMsg(`Bulk send failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setOnboardingBusy(false);
    }
  };

  // Admin-set Body / Face rating change. Optimistically updates local state
  // before the PUT lands; reverts on failure so the dropdown matches truth.
  const setCreatorRating = async (
    id: string,
    field: "body_rating" | "face_rating",
    value: "A" | "B" | "C" | "D" | "E" | "F" | null,
  ) => {
    const prev = creators.find((c) => c.id === id);
    setCreators((list) => list.map((c) => c.id === id ? { ...c, [field]: value } : c));
    try {
      await apiFetch(`/admin/accounts/creators/${id}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      setAccountMsg(`Failed to update ${field === "body_rating" ? "body" : "face"} rating.`);
      if (prev) setCreators((list) => list.map((c) => c.id === id ? { ...c, [field]: prev[field] } : c));
    }
  };

  const openView = async (type: ViewType, id: string) => {
    setViewType(type); setViewId(id); setViewEditing(false); setViewLoading(true); setError(null);
    try {
      const data = await apiFetch(`/admin/accounts/${type}s/${id}`);
      setViewData(data);
      setViewOriginal(data);
    } catch (err: any) { setError(err.message ?? "Failed to load details"); setViewType(null); }
    finally { setViewLoading(false); }
  };
  const closeView = () => { setViewType(null); setViewId(null); setViewData(null); setViewOriginal(null); setViewEditing(false); setShowDeleteConfirm(false); };

  const saveView = async () => {
    if (!viewType || !viewId || !viewData) return;
    setViewSaving(true); setError(null); setAccountMsg(null);
    try {
      const skip = new Set(["id", "created_at", "updated_at"]);
      // Diff against the loaded snapshot — only PUT fields the admin actually
      // edited. Sending the full row trips Zod on legacy bad values (e.g. a
      // non-email username) the admin never touched.
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(viewData)) {
        if (skip.has(k)) continue;
        if (viewOriginal && v === (viewOriginal as Record<string, unknown>)[k]) continue;
        payload[k] = v;
      }
      if (Object.keys(payload).length === 0) {
        setAccountMsg("No changes to save.");
        closeView();
        return;
      }
      await apiFetch(`/admin/accounts/${viewType}s/${viewId}`, { method: "PUT", body: JSON.stringify(payload) });
      const accountsData = await apiFetch("/admin/accounts?limit=500");
      if (accountsData?.users) setUsers(accountsData.users);
      if (accountsData?.creators) setCreators(accountsData.creators);
      setAccountMsg(`${viewType === "user" ? "User" : "Girl"} updated.`);
      closeView();
    } catch (err: any) { setError(err.message ?? "Save failed"); }
    finally { setViewSaving(false); }
  };

  const deleteFromView = async () => {
    if (!viewType || !viewId) return;
    setViewSaving(true); setError(null); setAccountMsg(null);
    try {
      if (viewType === "creator") {
        await apiFetch(`/admin/accounts/creators/${viewId}`, { method: "DELETE" });
        setCreators((prev) => prev.filter((c) => c.id !== viewId));
        setStats((prev) => prev ? { ...prev, creatorCount: Math.max(0, (prev.creatorCount ?? 0) - 1) } : prev);
        setAccountMsg("Girl deleted.");
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
        <DashboardTab
          stats={stats}
          subtitle={subtitle} setSubtitle={setSubtitle}
          tagline={tagline} setTagline={setTagline}
          featuredGirls={featuredGirls} setFeaturedGirls={setFeaturedGirls}
          creatorNames={creatorNames}
          savingSettings={savingSettings} setSavingSettings={setSavingSettings}
          settingsMsg={settingsMsg} setSettingsMsg={setSettingsMsg}
          setError={setError}
          pwCurrent={pwCurrent} setPwCurrent={setPwCurrent}
          pwNew={pwNew} setPwNew={setPwNew}
          pwSaving={pwSaving}
          pwMsg={pwMsg}
          showPwCurrent={showPwCurrent} setShowPwCurrent={setShowPwCurrent}
          showPwNew={showPwNew} setShowPwNew={setShowPwNew}
          onChangePassword={changePassword}
        />
      )}

      {sub === "stats" && <StatsTab metrics={metrics} />}

      {sub === "ads" && (
        <AdsTab
          ads={ads}
          savedAds={savedAds}
          isAdsDirty={isAdsDirty}
          savingSlot={savingSlot}
          savingAllAds={savingAllAds}
          adsMsg={adsMsg}
          onUpdateAd={updateAd}
          onClearSlot={clearSlot}
          onSaveAll={saveAllAds}
          onClearAdsMsg={() => setAdsMsg(null)}
        />
      )}

      {sub === "users" && (
        <UsersTab
          users={users}
          onToggleVerified={(id, current) => toggleVerified("user", id, current)}
          onView={(id) => openView("user", id)}
        />
      )}

      {sub === "creators" && (
        <CreatorsTab
          creators={creators}
          search={creatorSearch}
          setSearch={setCreatorSearch}
          onToggleVerified={(id, current) => toggleVerified("creator", id, current)}
          onSetRating={setCreatorRating}
          onView={(id) => openView("creator", id)}
          onSendOnboarding={sendOnboarding}
          onSendOnboardingBulk={sendOnboardingBulk}
          onboardingBusy={onboardingBusy}
        />
      )}

      {viewType && viewData && (
        <AccountEditModal
          viewType={viewType}
          viewData={viewData}
          viewEditing={viewEditing}
          viewSaving={viewSaving}
          showDeleteConfirm={showDeleteConfirm}
          setViewData={setViewData}
          setViewEditing={setViewEditing}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onSave={saveView}
          onDelete={deleteFromView}
          onClose={closeView}
        />
      )}
      {viewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="text-sm text-brand-muted">Loading...</div>
        </div>
      )}
    </div>
  );
}
