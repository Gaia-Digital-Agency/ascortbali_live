import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, clearTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";

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
    return (
      <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
        <Link className="btn btn-outline min-h-[44px] px-3 py-2.5 text-xs tracking-[0.14em]" to="/user">
          LOGIN
        </Link>
      </div>
    );
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
