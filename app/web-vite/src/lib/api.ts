// This module provides functions for interacting with the backend API.
import { APP_BASE_PATH, withBasePath } from "./paths";

const browserApiBase = withBasePath("/api");

// In browser runtime, always use same-origin API path to avoid stale/baked host values.
export const API_BASE =
  typeof window !== "undefined"
    ? browserApiBase
    : "/api";

export type Tokens = { accessToken: string; refreshToken: string };

// Functions for managing authentication tokens.
export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
}
export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("refreshToken") || localStorage.getItem("refreshToken");
}
export function setTokens(t: Tokens) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("accessToken", t.accessToken);
  window.sessionStorage.setItem("refreshToken", t.refreshToken);
  try {
    localStorage.setItem("accessToken", t.accessToken);
    localStorage.setItem("refreshToken", t.refreshToken);
  } catch {
    // ignore (storage may be blocked)
  }
  window.dispatchEvent(new Event("auth:change"));
}

// Clears authentication tokens from session and local storage.
export function clearTokens() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem("accessToken");
    window.sessionStorage.removeItem("refreshToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("auth:change"));
  } catch {
    // ignore
  }
}

// A wrapper around `fetch` that adds the API base URL and authorization token.
export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.get("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const doFetch = async () => fetch(`${API_BASE}${path}`, { ...init, headers });

  let res = await doFetch();
  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // Best-effort refresh-once, then retry original request.
      const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }));

      if (refreshed.ok && refreshed.body?.accessToken && refreshed.body?.refreshToken) {
        setTokens({ accessToken: refreshed.body.accessToken, refreshToken: refreshed.body.refreshToken });
        headers.set("authorization", `Bearer ${refreshed.body.accessToken}`);
        res = await doFetch();
      } else {
        clearTokens();
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `http_${res.status}`);
  }
  return res.json();
}
