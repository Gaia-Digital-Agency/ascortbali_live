import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";

// Routes where the age gate is allowed to appear. Everywhere else (T&C,
// privacy, login, creator preview, etc.) it stays hidden — creator preview
// has its own T&C popup, and the other pages don't warrant a re-prompt.
const ALLOWED_PATHS = new Set<string>(["/", "/creator/register", "/user/register"]);

// localStorage keys.
//   GENERIC_KEY is set immediately on Accept, regardless of whether the IP
//     is known yet. Prevents the flash-reopen race on slow networks (mobile).
//   IP_KEY_PREFIX is set additionally once the IP is known, so the gate
//     stays accepted across browsers/sessions sharing the same network.
const GENERIC_KEY = "age_gate_ok";
const IP_KEY_PREFIX = "age_gate_ok_";

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string) {
  try { window.localStorage.setItem(key, val); } catch { /* private mode */ }
}

export function AgeGateModal() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState<string | null>(null);
  // Track Accept locally so a late-arriving analytics-status response
  // cannot reopen the modal after the user has already dismissed it.
  const acceptedRef = useRef<boolean>(false);

  const isAllowedRoute = ALLOWED_PATHS.has(location.pathname);

  useEffect(() => {
    let cancelled = false;

    // Fast path: if the generic key is already set, never show the modal
    // for this browser. Synchronous, runs before any network call.
    if (safeGet(GENERIC_KEY)) return;

    (async () => {
      let learnedIp: string | null = null;
      try {
        const res = await fetch(`${API_BASE}/analytics/status`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const v = String(json?.ip ?? "").trim();
          if (v) learnedIp = v;
        }
      } catch { /* offline / blocked — fall through */ }

      if (cancelled) return;
      // If the user already tapped ENTER while the fetch was in-flight,
      // don't reopen the modal.
      if (acceptedRef.current) return;

      if (learnedIp) {
        setIp(learnedIp);
        const ipKey = IP_KEY_PREFIX + learnedIp.replace(/[^a-zA-Z0-9.-]/g, "_");
        if (safeGet(ipKey)) return; // already accepted under this IP
      }

      setOpen(true);
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once per mount

  const accept = () => {
    acceptedRef.current = true;
    safeSet(GENERIC_KEY, "1");
    if (ip) safeSet(IP_KEY_PREFIX + ip.replace(/[^a-zA-Z0-9.-]/g, "_"), "1");
    setOpen(false);
  };

  if (!open || !isAllowedRoute) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-brand-line bg-brand-surface p-8 shadow-luxe">
        <h2 className="font-display text-2xl">Age Verification</h2>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">
          I am 18 years of age and above and agree to this site terms of use and privacy statement.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={withBasePath("/terms")} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-brand-gold/40 px-4 py-2 text-xs text-brand-gold underline hover:border-brand-gold">T&C</a>
          <a href={withBasePath("/privacy")} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-brand-gold/40 px-4 py-2 text-xs text-brand-gold underline hover:border-brand-gold">Privacy Statement</a>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary min-h-[44px] px-6 py-2.5 text-xs" onClick={accept}>
            ENTER
          </button>
        </div>
      </div>
    </div>
  );
}
