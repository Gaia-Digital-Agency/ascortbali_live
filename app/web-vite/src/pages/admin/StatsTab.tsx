import type { Metrics } from "./types";

export function StatsTab({ metrics }: { metrics: Metrics | null }) {
  return (
    <>
      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">VISITORS</div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["today","7d","30d","all"] as const).map((w) => {
            const v = metrics?.visitors_by_window?.[w];
            const pv = metrics?.page_views_by_window?.[w];
            const empty = (v == null || v === 0) && (pv == null || pv === 0);
            return (
              <div key={w} className="rounded-2xl border border-brand-line bg-brand-surface2/40 p-4">
                <div className="text-[10px] tracking-[0.18em] text-brand-muted">{w.toUpperCase()}</div>
                {empty ? (
                  <div className="mt-1 text-[11px] text-brand-muted">Not Enough Data To Display</div>
                ) : (<>
                  <div className="mt-1 font-display text-2xl text-brand-text">{v ?? 0}</div>
                  <div className="mt-1 text-[10px] text-brand-muted/70">{pv ?? 0} page views</div>
                </>)}
              </div>
            );
          })}
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
            {!metrics?.regions?.length && <div className="text-xs text-brand-muted">Not Enough Data To Display</div>}
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
            {!metrics?.top_creators_7d?.length && <div className="text-brand-muted">Not Enough Data To Display</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">DEVICE SPLIT</div>
          <div className="mt-3 space-y-1 text-xs">
            {(metrics?.devices ?? []).length === 0 ? (
              <div className="text-brand-muted">Not Enough Data To Display</div>
            ) : (metrics?.devices ?? []).map((d) => (
              <div key={d.device} className="flex items-center justify-between">
                <span className="text-brand-muted capitalize">{d.device}</span><span className="text-brand-text">{d.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">NEW vs RETURNING</div>
          <div className="mt-3 space-y-1 text-xs">
            {(metrics?.new_vs_returning ?? []).length === 0 ? (
              <div className="text-brand-muted">Not Enough Data To Display</div>
            ) : (metrics?.new_vs_returning ?? []).map((r) => (
              <div key={r.kind} className="flex items-center justify-between">
                <span className="text-brand-muted capitalize">{r.kind}</span><span className="text-brand-text">{r.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-6 shadow-luxe">
          <div className="text-xs tracking-[0.22em] text-brand-muted">VOTES</div>
          <div className="mt-3 space-y-1 text-xs text-brand-muted">
            {!metrics?.voting || (metrics.voting.body_total === 0 && metrics.voting.face_total === 0 && metrics.voting.voters === 0) ? (
              <div>Not Enough Data To Display</div>
            ) : (<>
              <div>Body total: <span className="text-brand-text">{metrics.voting.body_total}</span></div>
              <div>Face total: <span className="text-brand-text">{metrics.voting.face_total}</span></div>
              <div>Unique voters: <span className="text-brand-text">{metrics.voting.voters}</span></div>
            </>)}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <div className="text-xs tracking-[0.22em] text-brand-muted">SERVICE SPLITS</div>
        <div className="mt-3">
          {(metrics?.service_splits ?? []).length === 0 ? (
            <div className="text-xs text-brand-muted">Not Enough Data To Display</div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-3">
              {(metrics?.service_splits ?? []).map((row) => {
                const max = Math.max(1, ...(metrics?.service_splits ?? []).map((x) => x.creators));
                const pct = Math.round((row.creators / max) * 100);
                return (
                  <div key={row.service}>
                    <div className="flex items-center justify-between text-brand-muted">
                      <span>{row.service}</span><span className="text-brand-text">{row.creators}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-brand-surface2/60">
                      <div className="h-1.5 rounded-full bg-brand-gold" style={{ width: pct + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
