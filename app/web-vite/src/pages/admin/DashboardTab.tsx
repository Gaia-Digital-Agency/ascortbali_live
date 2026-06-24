import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { PasswordInput } from "../../components/LoginForm";
import type { AdminStats } from "./types";

export function DashboardTab({
  stats,
  subtitle, setSubtitle,
  tagline, setTagline,
  featuredGirls, setFeaturedGirls,
  creatorNames,
  savingSettings, setSavingSettings,
  settingsMsg, setSettingsMsg,
  setError,
  // password change
  pwCurrent, setPwCurrent,
  pwNew, setPwNew,
  pwSaving,
  pwMsg,
  showPwCurrent, setShowPwCurrent,
  showPwNew, setShowPwNew,
  onChangePassword,
}: {
  stats: AdminStats | null;
  subtitle: string; setSubtitle: (v: string) => void;
  tagline: string; setTagline: (v: string) => void;
  featuredGirls: string[]; setFeaturedGirls: React.Dispatch<React.SetStateAction<string[]>>;
  creatorNames: { id: string; model_name: string }[];
  savingSettings: boolean; setSavingSettings: (v: boolean) => void;
  settingsMsg: string | null; setSettingsMsg: (v: string | null) => void;
  setError: (v: string | null) => void;
  pwCurrent: string; setPwCurrent: (v: string) => void;
  pwNew: string; setPwNew: (v: string) => void;
  pwSaving: boolean;
  pwMsg: string | null;
  showPwCurrent: boolean; setShowPwCurrent: React.Dispatch<React.SetStateAction<boolean>>;
  showPwNew: boolean; setShowPwNew: React.Dispatch<React.SetStateAction<boolean>>;
  onChangePassword: () => void;
}) {
  const saveSetting = async (key: string, value: string, label: string) => {
    setSavingSettings(true); setSettingsMsg(null); setError(null);
    try {
      await apiFetch(`/admin/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) });
      setSettingsMsg(`${label} saved.`);
    } catch { setError(`Failed to save ${label.toLowerCase()}.`); }
    finally { setSavingSettings(false); }
  };

  const saveFeaturedGirls = async () => {
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
  };

  return (
    <>
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
        <div className="text-xs tracking-[0.22em] text-brand-muted">HEADER SUBTITLE</div>
        <p className="mt-1 text-[11px] text-brand-muted/70">Shown under the "BALI GIRLS" title in the site header. Renders on two lines, left-aligned. Use "|" to force a break between line 1 and line 2 (e.g. <code>Free, Real | Simple</code>).</p>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none focus:border-brand-gold/60"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Free, Real | Simple"
          />
          <button
            type="button"
            disabled={savingSettings}
            onClick={() => saveSetting("subtitle", subtitle, "Header subtitle")}
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
            onClick={() => saveSetting("tagline", tagline, "Tagline")}
            className="btn btn-primary py-3"
          >
            {savingSettings ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">FEATURED GIRLS (CAROUSEL)</div>
        <p className="mt-2 text-xs text-brand-muted">Type to search and pick 4 active creators for the featured girls carousel on the homepage.</p>
        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          {([0, 1, 2, 3] as const).map((idx) => (
            <FeaturedAutocomplete
              key={idx}
              label={`GIRL ${idx + 1}`}
              value={featuredGirls[idx] || ""}
              options={creatorNames}
              onChange={(v) =>
                setFeaturedGirls((prev) => { const next = [...prev] as string[]; next[idx] = v; return next; })
              }
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={savingSettings}
            onClick={saveFeaturedGirls}
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
          <button onClick={onChangePassword} disabled={pwSaving || !pwNew.trim()} className="btn btn-primary py-3">
            {pwSaving ? "SAVING..." : "UPDATE"}
          </button>
        </div>
        {pwMsg ? <div className="mt-4 text-xs text-emerald-400">{pwMsg}</div> : null}
      </div>
    </>
  );
}

// Autocomplete picker for a single featured-girl slot. Suggestions are drawn
// only from `options` (the active-creators list from /admin/creator-names), and
// a value is only committed when it exactly matches an active creator — typed
// text that doesn't match an active girl is reverted on blur. This enforces
// "active girls only" while replacing the old long dropdown with a typeahead.
function FeaturedAutocomplete({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { id: string; model_name: string }[];
  onChange: (v: string) => void;
}) {
  // query === null → input shows the committed value; otherwise it shows what
  // the user is typing.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const text = query ?? value;
  const q = text.trim().toLowerCase();
  const matches = (q
    ? options.filter((o) => o.model_name.toLowerCase().includes(q))
    : options
  ).slice(0, 8);

  const commit = (name: string) => { onChange(name); setQuery(null); setOpen(false); };

  return (
    <div className="relative">
      <div className="text-[10px] tracking-[0.18em] text-brand-muted">{label}</div>
      <input
        className="mt-1 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 pr-8 text-sm outline-none focus:border-brand-gold/60"
        value={text}
        placeholder="Type a name…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so an onMouseDown on a suggestion commits first.
          setTimeout(() => {
            if (query !== null) {
              const typed = query.trim();
              if (typed === "") commit("");
              else {
                const m = options.find((o) => o.model_name.toLowerCase() === typed.toLowerCase());
                if (m) commit(m.model_name);
                else setQuery(null); // not an active girl → revert to last valid value
              }
            }
            setOpen(false);
          }, 150);
        }}
      />
      {value && query === null && (
        <button
          type="button"
          aria-label="Clear"
          onMouseDown={(e) => { e.preventDefault(); commit(""); }}
          className="absolute right-3 top-[34px] text-xs text-brand-muted hover:text-brand-text"
        >
          ×
        </button>
      )}
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-brand-line bg-brand-surface shadow-luxe">
          {matches.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); commit(o.model_name); }}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-brand-surface2/60"
              >
                {o.model_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
