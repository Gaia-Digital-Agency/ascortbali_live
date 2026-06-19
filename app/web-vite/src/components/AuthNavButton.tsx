import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";


function LoginDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-outline min-h-[44px] px-4 py-2.5 text-xs tracking-[0.14em]"
      >
        LOGIN ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-0.5 w-48 overflow-hidden rounded-xl border-2 border-brand-gold/30 bg-brand-surface/95 shadow-2xl shadow-brand-gold/10 backdrop-blur-sm">
          <Link
            to="/user"
            onClick={() => setOpen(false)}
            className="block px-5 py-3.5 text-xs tracking-[0.14em] hover:bg-brand-gold/10 hover:text-brand-gold transition-colors"
          >
            USER LOGIN
          </Link>
          <Link
            to="/creator"
            onClick={() => setOpen(false)}
            className="block px-5 py-3.5 text-xs tracking-[0.14em] hover:bg-brand-gold/10 hover:text-brand-gold transition-colors border-t border-brand-line/50"
          >
            GIRLS LOGIN
          </Link>
        </div>
      )}
    </div>
  );
}

export function AuthNavButton() {
  const [role, setRole] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = async () => {
      const token = window.sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
      if (!token) {
        setLoggedIn(false);
        setRole(null);
        return;
      }
      try {
        const me = await apiFetch("/me");
        setRole(me?.role ?? null);
        setLoggedIn(Boolean(me?.role));
      } catch {
        clearTokens();
        setLoggedIn(false);
        setRole(null);
      }
    };
    check();
    const onFocus = () => check();
    const onAuthChange = () => check();
    window.addEventListener("focus", onFocus);
    window.addEventListener("auth:change", onAuthChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("auth:change", onAuthChange);
    };
  }, []);

  if (!loggedIn) {
    return <LoginDropdown />;
  }

  const profileHref =
    role === "creator" ? "/creator/logged" : role === "admin" ? "/admin/logged" : "/user/logged";

  return (
    <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
      <Link className="btn btn-outline min-h-[44px] px-3 py-2.5 text-xs tracking-[0.14em]" to={profileHref}>
        EDIT PROFILE
      </Link>
      <button
        onClick={() => {
          clearTokens();
          setLoggedIn(false);
          setRole(null);
          window.location.assign(withBasePath("/"));
        }}
        className="btn btn-outline min-h-[44px] px-3 py-2.5 text-xs tracking-[0.14em]"
      >
        LOGOUT
      </button>
    </div>
  );
}
