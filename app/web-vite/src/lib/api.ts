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
      // Don't redirect if we're already on the login page — that creates an
      // infinite loop (login pages call /me on mount to detect "already
      // signed in"; on 401 we'd just bounce back to ourselves). Just throw
      // and let the caller's catch block render the form.
      const target = withBasePath(loginPathForCurrentRoute());
      if (window.location.pathname !== target) {
        window.location.assign(target);
      }
    }
    throw new Error("unauthenticated");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Validation failures (Zod) come back as { error: "invalid_body",
    // details: flatten() }. Surface the actual field/form messages instead of
    // the meaningless "invalid_body" code so the user knows what to fix.
    if (body?.error === "invalid_body" && body?.details) {
      const fieldErrors = body.details.fieldErrors ?? {};
      const parts = Object.entries(fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`);
      const formErrors: string[] = body.details.formErrors ?? [];
      const detail = [...parts, ...formErrors].filter(Boolean).join("; ");
      const err = new Error(detail || "Some details are invalid — please check the form.");
      (err as any).code = "invalid_body";
      throw err;
    }
    throw new Error(body?.error ?? `http_${res.status}`);
  }
  return res.json();
}
