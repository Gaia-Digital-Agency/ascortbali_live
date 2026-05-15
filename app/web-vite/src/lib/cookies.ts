// Client-side cookie / localStorage helpers + anonymous visitor identity.

const VISITOR_KEY = "bg_visitor_id";
const FIRST_VISIT_KEY = "bg_first_visit_at";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400e3).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function randomId(): string {
  // RFC4122-style v4 — works in browsers without crypto.randomUUID polyfill.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Returns a stable visitor UUID for this browser. Creates on first call. */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  // Prefer existing localStorage value (set by AnalyticsBeacon), fall back to cookie.
  let id = localStorage.getItem("visitorId") || getCookie(VISITOR_KEY);
  if (!id) {
    id = randomId();
    setCookie(VISITOR_KEY, id);
    setCookie(FIRST_VISIT_KEY, new Date().toISOString());
    try { localStorage.setItem("visitorId", id); } catch { /* private mode */ }
  } else {
    // Mirror into both storages so they stay in sync across visits.
    if (!getCookie(VISITOR_KEY)) setCookie(VISITOR_KEY, id);
    try { if (!localStorage.getItem("visitorId")) localStorage.setItem("visitorId", id); } catch { /* */ }
  }
  return id;
}

export { getCookie, setCookie };
