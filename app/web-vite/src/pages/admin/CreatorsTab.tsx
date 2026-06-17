import type { CreatorAccount, Rating } from "./types";

const RATING_OPTIONS: Rating[] = ["A", "B", "C", "D", "E", "F"];

export function CreatorsTab({
  creators, search, setSearch, onToggleVerified, onSetRating, onView,
  onSendOnboarding, onSendOnboardingBulk, onboardingBusy,
}: {
  creators: CreatorAccount[];
  search: string;
  setSearch: (v: string) => void;
  onToggleVerified: (id: string, current: boolean) => void;
  onSetRating: (id: string, field: "body_rating" | "face_rating", value: Rating | null) => void;
  onView: (id: string) => void;
  onSendOnboarding: (id: string) => void;
  onSendOnboardingBulk: () => void;
  onboardingBusy: boolean;
}) {
  const q = search.trim().toLowerCase();
  const matches = (c: CreatorAccount) =>
    !q || (c.username || "").toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  const active = creators.filter((c) => c.is_active && matches(c));
  const inactive = creators.filter((c) => !c.is_active && matches(c));
  const activeTotal = creators.filter((c) => c.is_active).length;
  const inactiveTotal = creators.filter((c) => !c.is_active).length;

  const renderTable = (list: CreatorAccount[], emptyMsg: string) => (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-line text-left text-xs tracking-[0.18em] text-brand-muted">
            <th className="pb-3 pr-4 font-normal">USERNAME</th>
            <th className="pb-3 pr-4 font-normal">DISPLAY NAME</th>
            <th className="pb-3 pr-4 font-normal">BODY</th>
            <th className="pb-3 pr-4 font-normal">FACE</th>
            <th className="pb-3 pr-4 font-normal">VERIFIED</th>
            <th className="pb-3 pr-4 font-normal">LAST SEEN</th>
            <th className="pb-3 font-normal">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={7} className="py-4 text-xs text-brand-muted">{emptyMsg}</td></tr>
          ) : list.map((c) => (
            <tr key={c.id} className="border-b border-brand-line/40 last:border-0">
              <td className="py-3 pr-4 font-mono text-xs">{c.username || "—"}</td>
              <td className="py-3 pr-4 text-xs">{c.model_name || "—"}</td>
              <td className="py-3 pr-4">
                <RatingSelect
                  value={c.body_rating}
                  ariaLabel={`Body rating for ${c.username || c.id}`}
                  onChange={(v) => onSetRating(c.id, "body_rating", v)}
                />
              </td>
              <td className="py-3 pr-4">
                <RatingSelect
                  value={c.face_rating}
                  ariaLabel={`Face rating for ${c.username || c.id}`}
                  onChange={(v) => onSetRating(c.id, "face_rating", v)}
                />
              </td>
              <td className="py-3 pr-4">
                <button
                  type="button"
                  onClick={() => onToggleVerified(c.id, c.verified)}
                  title={c.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                  aria-label={c.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                  className={`h-5 w-5 rounded-full border-2 transition ${c.verified ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-transparent border-brand-muted/60 hover:border-brand-muted"}`}
                />
              </td>
              <td className="py-3 pr-4 text-xs text-brand-muted">{c.last_seen || "—"}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => onView(c.id)} className="btn btn-outline px-3 py-1.5 text-xs">VIEW</button>
                  <button
                    onClick={() => onSendOnboarding(c.id)}
                    disabled={onboardingBusy}
                    title="Send the onboarding WhatsApp (initial-login link + temp password)"
                    className="btn btn-outline px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    INVITE
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-5 shadow-luxe">
        <label className="flex items-center gap-3">
          <span className="text-xs tracking-[0.22em] text-brand-muted">SEARCH</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by username or id…"
            className="flex-1 rounded-lg border border-brand-line bg-transparent px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted/60 focus:border-brand-text focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs tracking-[0.18em] text-brand-muted hover:text-brand-text"
            >
              CLEAR
            </button>
          )}
        </label>
        {search && (
          <div className="mt-2 text-xs text-brand-muted">
            Showing {active.length + inactive.length} of {creators.length} creators
          </div>
        )}
      </div>
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-brand-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            ACTIVE CREATORS ({active.length}{search ? ` of ${activeTotal}` : ""})
          </div>
          <button
            onClick={onSendOnboardingBulk}
            disabled={onboardingBusy}
            title="Send the onboarding WhatsApp to all unverified creators with a phone number"
            className="btn btn-outline px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {onboardingBusy ? "SENDING…" : "INVITE ALL UNVERIFIED"}
          </button>
        </div>
        {renderTable(active, search ? "No matches." : "No active creators.")}
      </div>
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-brand-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-muted/40" />
          INACTIVE CREATORS ({inactive.length}{search ? ` of ${inactiveTotal}` : ""})
        </div>
        {renderTable(inactive, search ? "No matches." : "No inactive creators.")}
      </div>
    </>
  );
}

// Compact A-F dropdown. An empty selection clears the rating (PUT body_rating
// = null). Optimistic update happens in the caller's onChange.
function RatingSelect({
  value, ariaLabel, onChange,
}: {
  value: Rating | null;
  ariaLabel: string;
  onChange: (next: Rating | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      aria-label={ariaLabel}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : (v as Rating));
      }}
      className="rounded-md border border-brand-line bg-transparent px-2 py-1 text-xs uppercase tracking-[0.18em] text-brand-text focus:border-brand-text focus:outline-none"
    >
      <option value="">—</option>
      {RATING_OPTIONS.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}
