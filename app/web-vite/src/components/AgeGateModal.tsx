import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { withBasePath } from "../lib/paths";

const STORAGE_PREFIX = "age_gate_ok_";

// Routes where the age gate is allowed to appear. Everywhere else (T&C,
// privacy, login, creator preview, etc.) it stays hidden — creator preview
// has its own T&C popup, and the other pages don't warrant a re-prompt.
const ALLOWED_PATHS = new Set<string>(["/", "/creator/register", "/user/register"]);

type AgeGateStatus = {
  ip: string | null;
  open: boolean;
};

export function AgeGateModal() {
  const location = useLocation();
  const [state, setState] = useState<AgeGateStatus>({ ip: null, open: false });

  const isAllowedRoute = ALLOWED_PATHS.has(location.pathname);

  const localKey = useMemo(() => {
    const safeIp = (state.ip || "no-ip").replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${STORAGE_PREFIX}${safeIp}`;
  }, [state.ip]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics/status`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const ip = String(json?.ip ?? "").trim();
          if (ip) {
            setState((prev) => ({ ...prev, ip }));
            if (window.localStorage.getItem(`${STORAGE_PREFIX}${ip.replace(/[^a-zA-Z0-9.-]/g, "_")}`)) {
              setState((prev) => ({ ...prev, open: false }));
              return;
            }
          }
        }
      } catch {
        // Keep the existing stored preference if IP cannot be fetched.
        const key = localKey;
        if (key && window.localStorage.getItem(key)) {
          setState((prev) => ({ ...prev, open: false }));
          return;
        }
      }
      setState((prev) => ({ ...prev, open: true }));
    };
    check();
  }, [localKey]);

  const accept = () => {
    if (state.ip) {
      window.localStorage.setItem(`${STORAGE_PREFIX}${state.ip.replace(/[^a-zA-Z0-9.-]/g, "_")}`, "1");
    } else if (localKey) {
      window.localStorage.setItem(localKey, "1");
    }
    setState((prev) => ({ ...prev, open: false }));
  };

  if (!state.open || !isAllowedRoute) return null;

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
          <button className="btn btn-primary min-h-[44px] px-6 py-2.5 text-xs" onClick={accept}>
            ENTER
          </button>
        </div>
      </div>
    </div>
  );
}
