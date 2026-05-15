// Body/Face voting UI on the public creator profile.
// Anonymous (cookie-based). Highest-count option is the default radial.
// Visitor's own selection takes precedence. Hover shows the count.
import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { getVisitorId } from "../lib/cookies";

const BODY: Array<{ key: "firm" | "curvy" | "huggable"; label: string }> = [
  { key: "firm",     label: "Firm" },
  { key: "curvy",    label: "Curvy" },
  { key: "huggable", label: "Huggable" },
];
const FACE: Array<{ key: "cute" | "sexy" | "pleasant"; label: string }> = [
  { key: "cute",     label: "Cute" },
  { key: "sexy",     label: "Sexy" },
  { key: "pleasant", label: "Pleasant" },
];

type Counts = Record<string, number>;
type VotesState = {
  body_votes: Counts;
  face_votes: Counts;
  my: { body: string | null; face: string | null };
};

function topKey(counts: Counts, options: ReadonlyArray<{ key: string }>): string {
  let best = options[0].key;
  let bestN = -1;
  for (const o of options) {
    const n = Number(counts?.[o.key] ?? 0);
    if (n > bestN) { bestN = n; best = o.key; }
  }
  return best;
}

export function BodyFaceVotes({ slug }: { slug: string }) {
  const [state, setState] = useState<VotesState | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    const visitorId = getVisitorId();
    fetch(`${API_BASE}/votes/${encodeURIComponent(slug)}?visitorId=${encodeURIComponent(visitorId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (alive && j) setState(j); })
      .catch(() => { /* non-critical */ });
    return () => { alive = false; };
  }, [slug]);

  if (!state) return null;

  const submit = async (axis: "body" | "face", value: string) => {
    if (pending) return;
    setPending(true);
    const visitorId = getVisitorId();
    // Optimistic update
    setState((prev) => {
      if (!prev) return prev;
      const counts: Counts = { ...prev[`${axis}_votes` as const] };
      const prevPick = prev.my[axis];
      if (prevPick && counts[prevPick] !== undefined) counts[prevPick] = Math.max(0, counts[prevPick] - 1);
      counts[value] = (counts[value] ?? 0) + 1;
      return {
        ...prev,
        [`${axis}_votes`]: counts,
        my: { ...prev.my, [axis]: value },
      } as VotesState;
    });
    try {
      const res = await fetch(`${API_BASE}/votes/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitorId, [axis]: value }),
      });
      const json = await res.json();
      if (json?.body_votes) setState(json);
    } catch { /* keep optimistic state */ }
    finally { setPending(false); }
  };

  const renderRow = (
    title: string,
    axis: "body" | "face",
    options: typeof BODY | typeof FACE,
    counts: Counts,
  ) => {
    const active = state.my[axis] ?? topKey(counts, options);
    return (
      <div className="flex items-start justify-between gap-4 border-b border-brand-line/60 pb-2 text-sm">
        <span className="shrink-0 text-brand-muted">{title}</span>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {options.map((opt) => {
            const checked = active === opt.key;
            const n = Number(counts?.[opt.key] ?? 0);
            return (
              <label
                key={opt.key}
                className="flex cursor-pointer items-center gap-1.5 text-xs"
                title={`${n} vote${n === 1 ? "" : "s"}`}
              >
                <span
                  className={
                    `inline-block h-3.5 w-3.5 rounded-full border-2 transition ` +
                    (checked
                      ? "border-brand-gold bg-brand-gold shadow-[0_0_4px_rgba(212,175,122,0.7)]"
                      : "border-brand-muted/60 bg-transparent hover:border-brand-muted")
                  }
                />
                <input
                  type="radio"
                  name={`${axis}-vote`}
                  className="sr-only"
                  checked={checked}
                  onChange={() => submit(axis, opt.key)}
                  disabled={pending}
                />
                <span className={checked ? "text-brand-text" : "text-brand-muted"}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderRow("Body", "body", BODY, state.body_votes)}
      {renderRow("Face", "face", FACE, state.face_votes)}
    </>
  );
}
