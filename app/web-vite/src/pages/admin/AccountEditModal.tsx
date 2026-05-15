import { SERVICES_OPTIONS } from "../../lib/creatorOptions";
import { FIELD_OPTIONS, TEXTAREA_FIELDS, LABEL_OVERRIDES } from "./constants";
import type { ViewData, ViewType } from "./types";

export function AccountEditModal({
  viewType, viewData, viewEditing, viewSaving,
  showDeleteConfirm,
  setViewData, setViewEditing, setShowDeleteConfirm,
  onSave, onDelete, onClose,
}: {
  viewType: ViewType;
  viewData: ViewData;
  viewEditing: boolean;
  viewSaving: boolean;
  showDeleteConfirm: boolean;
  setViewData: React.Dispatch<React.SetStateAction<ViewData | null>>;
  setViewEditing: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-brand-line bg-brand-bg p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-brand-text">
            {viewEditing ? "Edit" : "View"} {viewType === "user" ? "User" : "Creator"}
          </h2>
          <button onClick={onClose} className="btn btn-outline px-4 py-1.5 text-xs text-white border-white/40 hover:border-white">CLOSE</button>
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
                        {Object.entries(val as unknown as Record<string, number>).map(([opt, count]) => (
                          <div key={opt}>
                            <div className="text-[10px] text-brand-muted capitalize">{opt}</div>
                            <input
                              type="number"
                              min={0}
                              className="mt-1 w-full rounded-lg border border-brand-line bg-brand-bg/40 px-2 py-1 text-xs outline-none focus:border-brand-gold/60"
                              value={count}
                              onChange={(e) =>
                                setViewData((prev) => {
                                  if (!prev) return prev;
                                  const cur = (prev[key] as unknown as Record<string, number>) ?? {};
                                  return { ...prev, [key]: { ...cur, [opt]: Math.max(0, parseInt(e.target.value || "0", 10)) } as unknown as ViewData[string] };
                                })
                              }
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
                      {val && !FIELD_OPTIONS[key].includes(String(val)) && (
                        <option value={String(val)}>{String(val)} (current)</option>
                      )}
                      {FIELD_OPTIONS[key].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : key === "services" ? (
                    <div className="mt-1 rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-xs">
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
                    {Object.entries(((val as unknown as Record<string, number>) ?? {})).map(([opt, count]) => (
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
              <button onClick={onSave} disabled={viewSaving} className="btn btn-primary px-4 py-2 text-xs">
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
              <button onClick={onDelete} disabled={viewSaving} className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30">
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
  );
}
