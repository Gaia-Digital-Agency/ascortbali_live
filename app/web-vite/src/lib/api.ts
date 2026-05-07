// This module provides functions for interacting with the backend API.
import { withBasePath } from "./paths";

const browserApiBase = withBasePath("/api");

// In browser runtime, always use same-origin API path to avoid stale/baked host values.
export const API_BASE =
  typeof window !== "undefined"
    ? browserApiBase
    : "/api";

// Phase B (May 2026): refresh tokens were removed. Sessions are a single
// 24h access token; on 401 the user is sent back to the matching login page.
export type Tokens = { accessToken: string };

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
}

// Back-compat: some older code paths still call getRefreshToken() to "is there
// any session?" — the function still exists but always returns null. Treat it
// as deprecated; callers should use getAccessToken() instead.
export function getRefreshToken(): string | null {
  return null;
}

export function setTokens(t: Tokens) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("accessToken", t.accessToken);
  try {
    localStorage.setItem("accessToken", t.accessToken);
  } catch {
    // ignore (storage may be blocked)
  }
  window.dispatchEvent(new Event("auth:change"));
}

// Clears authentication tokens from session and local storage. Also scrubs the
// pre-Phase-B "refreshToken" key in case it lingered from an older session.
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

// Pick the appropriate login route for the current portal context. Used when
// a request returns 401 — there is no refresh path anymore, so we send the
// user back to sign in.
function loginPathForCurrentRoute(): string {
  if (typeof window === "undefined") return "/user";
  const p = window.location.pathname;
  if (p.startsWith("/admin")) return "/admin";
  if (p.startsWith("/creator")) return "/creator";
  return "/user";
}

// A wrapper around `fetch` that adds the API base URL and authorization token.
// On 401: clear the (now-expired) token and redirect to the matching login.
// No refresh attempt — the backend doesn't issue refresh tokens anymore.
export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.get("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.assign(withBasePath(loginPathForCurrentRoute()));
    }
    throw new Error("unauthenticated");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `http_${res.status}`);
  }
  return res.json();
}
