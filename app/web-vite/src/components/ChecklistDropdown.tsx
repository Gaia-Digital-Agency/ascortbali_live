import { useEffect, useRef, useState } from "react";

/**
 * Multi-select with a checklist popover. Looks like a regular styled select
 * (matches the rest of the form chrome) but opens a checkbox panel so users
 * can pick multiple options at once.
 *
 * Behavior:
 * - Closed: shows comma-separated summary of `selected`, or `placeholder`.
 * - Open: panel below with one checkbox per option. Click outside or press
 *   Escape to close.
 * - Caller controls `selected: string[]`; component just emits `onChange`.
 *
 * Used by:
 * - CreatorRegisterPage  (Service Area)
 * - CreatorLoggedPage    (Service Area)
 */
export function ChecklistDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary = selected.length === 0 ? placeholder : selected.join(", ");
  const isEmpty = selected.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        // Mirror the visual of a styled <select>: same border, bg, padding,
        // gold focus border, plus pr-11 to leave room for the chevron on the
        // right (matching the global select rule in global.css).
        className="relative flex w-full items-center rounded-2xl border border-brand-line bg-brand-surface2/40 py-3 pl-4 pr-11 text-left text-sm outline-none focus:border-brand-gold/60"
      >
        <span className={`truncate ${isEmpty ? "text-brand-muted/60" : ""}`}>{summary}</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-gold"
        >
          ▾
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-2xl border border-brand-line bg-brand-bg shadow-luxe">
          <div className="space-y-1 p-2">
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-brand-surface2/60"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) onChange([...selected, opt]);
                      else onChange(selected.filter((v) => v !== opt));
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
