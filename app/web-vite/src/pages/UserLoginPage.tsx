import { useState } from "react";
import { withBasePath } from "../lib/paths";
import { API_BASE, apiFetch, setTokens } from "../lib/api";
import LoginForm from "../components/LoginForm";
import { PasswordInput } from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";

type LoginMode = "choice" | "verify" | "login";

export default function UserLoginPage() {
  const [loginMode, setLoginMode] = useState<LoginMode>("choice");

  // Email + password login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPw, setShowLoginPw] = useState(false);

  const doPasswordLogin = async () => {
    const email = loginEmail.trim().toLowerCase();
    const pw = loginPassword.trim();
    if (!email || !pw) {
      setLoginError("Enter your Email and Password.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portal: "user", username: email, password: pw }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "invalid_credentials") {
          throw new Error("Email or Password is incorrect.");
        }
        throw new Error(json?.error ?? "Login failed");
      }

      setTokens({ accessToken: json.accessToken });

      const profile = await apiFetch("/me");
      if (profile.role !== "user") {
        const { clearTokens } = await import("../lib/api");
        clearTokens();
        throw new Error("This account is not a user account.");
      }
      window.location.href = withBasePath("/");
    } catch (err: any) {
      setLoginError(err.message ?? "Unable to sign in.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Sign In — Bali Girls"
        description="Sign in to your Bali Girls member account."
        path="/user"
      />

      {/* ── Choice screen ──────────────────────────────────────────── */}
      {loginMode === "choice" ? (
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <div className="text-xs tracking-luxe text-brand-muted">USER</div>
            <h1 className="mt-2 font-display text-3xl">Sign In</h1>
            <p className="mt-2 text-sm text-brand-muted">Choose your sign-in method</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setLoginMode("verify")}
              className="btn btn-primary btn-block min-h-[52px] py-3 text-base"
            >
              FIRST TIME LOG IN (VERIFY)
            </button>
            <p className="text-xs text-center text-brand-muted">
              Enter your WhatsApp number. We will verify it on WhatsApp. Always requires verification.
            </p>

            <div className="relative flex items-center gap-3 py-2">
              <span className="h-px flex-1 bg-brand-line" />
              <span className="text-xs text-brand-muted">OR</span>
              <span className="h-px flex-1 bg-brand-line" />
            </div>

            <button
              onClick={() => setLoginMode("login")}
              className="btn btn-outline btn-block min-h-[52px] py-3 text-base"
            >
              LOGIN
            </button>
            <p className="text-xs text-center text-brand-muted">
              Sign in using your Email and Password.
            </p>
          </div>

          <div className="text-center text-xs text-brand-muted">
            No account?{" "}
            <a href={withBasePath("/user/register")} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
              Register here
            </a>
          </div>
        </div>
      ) : null}

      {/* ── Verify screen (WhatsApp / SMS 2FA) ──────────────────────── */}
      {loginMode === "verify" ? (
        <>
          <div className="text-center mb-4">
            <button
              onClick={() => { setLoginMode("choice"); setLoginError(null); }}
              className="text-xs text-brand-muted hover:text-brand-text underline"
            >
              &larr; Back to sign-in options
            </button>
          </div>
          <LoginForm
            portal="user"
            label="USER"
            defaultEmail="user@email.com"
            defaultPassword="User@123"
            emailLabel="USER ID"
            emailPlaceholder="name@email.com"
            redirectPath="/"
            roleCheck={(role) => role === "user"}
            roleErrorMessage="This account is not a user account."
            footer={
              <div className="text-center text-xs text-brand-muted">
                No account?{" "}
                <a href={withBasePath("/user/register")} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
                  Register here
                </a>
              </div>
            }
          />
        </>
      ) : null}

      {/* ── Login screen (email + password) ─────────────────────────── */}
      {loginMode === "login" ? (
        <>
          <div className="text-center mb-4">
            <button
              onClick={() => { setLoginMode("choice"); setLoginError(null); }}
              className="text-xs text-brand-muted hover:text-brand-text underline"
            >
              &larr; Back to sign-in options
            </button>
          </div>
          <div className="mx-auto max-w-md space-y-6">
            <div className="text-center">
              <div className="text-xs tracking-luxe text-brand-muted">USER</div>
              <h1 className="mt-2 font-display text-3xl">Sign In</h1>
            </div>

            <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
              <form onSubmit={(e) => { e.preventDefault(); doPasswordLogin(); }} className="space-y-4">
                <div>
                  <label className="text-xs tracking-[0.22em] text-brand-muted">EMAIL</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@email.com"
                    type="email"
                    autoComplete="email"
                    aria-label="Email"
                  />
                </div>

                <div>
                  <label className="text-xs tracking-[0.22em] text-brand-muted">PASSWORD</label>
                  <PasswordInput
                    className="mt-2"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    visible={showLoginPw}
                    onToggleVisibility={() => setShowLoginPw((prev) => !prev)}
                  />
                </div>

                {loginError ? <div className="text-xs text-red-400">{loginError}</div> : null}

                <button type="submit" disabled={loginLoading} className="btn btn-primary btn-block min-h-[44px] py-3">
                  {loginLoading ? "SIGNING IN..." : "USER SIGN IN"}
                </button>

                <div className="text-xs text-brand-muted text-center">
                  Sign in using your Email and Password.
                </div>
              </form>
            </div>

            <div className="text-center text-xs text-brand-muted">
              No account?{" "}
              <a href={withBasePath("/user/register")} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
                Register here
              </a>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
