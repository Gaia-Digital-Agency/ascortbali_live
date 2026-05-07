import { useEffect } from "react";
import { API_BASE } from "../lib/api";

export function AnalyticsBeacon() {
  useEffect(() => {
    const run = async () => {
      try {
        const base = API_BASE;
        const ua = navigator.userAgent;
        const res = await fetch(`${base}/analytics/visit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userAgent: ua }),
        });
        const json = await res.json();
        if (json?.visitorId) localStorage.setItem("visitorId", json.visitorId);
      } catch {
        // Ignore any errors to avoid disrupting the main application flow.
      }
    };
    run();
  }, []);

  return null;
}
