import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { getVisitorId } from "../lib/cookies";

export function AnalyticsBeacon() {
  const loc = useLocation();
  useEffect(() => {
    const run = async () => {
      try {
        const ua = navigator.userAgent;
        const visitorId = getVisitorId();
        const res = await fetch(`${API_BASE}/analytics/visit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userAgent: ua,
            visitorId,
            path: loc.pathname,
            referer: document.referrer || null,
          }),
        });
        const json = await res.json();
        if (json?.visitorId) localStorage.setItem("visitorId", json.visitorId);
      } catch {
        // Ignore — analytics is non-critical.
      }
    };
    run();
  }, [loc.pathname]);
  return null;
}
