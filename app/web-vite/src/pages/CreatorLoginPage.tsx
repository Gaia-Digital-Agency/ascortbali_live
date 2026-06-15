import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { withBasePath } from "../lib/paths";
import { API_BASE, apiFetch, setTokens } from "../lib/api";
import LoginForm from "../components/LoginForm";
import { PasswordInput } from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";

type LoginMode = "choice" | "verify" | "login";

export default function CreatorLoginPage() {
  const [loginMode, setLoginMode] = useState<LoginMode>("choice");
  const navigate = useNavigate();

  // Confirmation popup state
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [noNudeConfirmed, setNoNudeConfirmed] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<((v: boolean) => void) | null>(null);

  // Email + password login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPw, setShowLoginPw] = useState(false);

  const hasAllConfirmations = policyConfirmed && termsConfirmed && privacyConfirmed && noNudeConfirmed;

  const beforeLogin = useCallback((): Promise<boolean> => {
    if (hasAllConfirmations) return Promise.resolve(true);
    return new Promise((resolve) => {
      setPendingResolve(() => resolve);
      setShowConfirmPopup(true);
    });
  }, [hasAllConfirmations]);

  const handleConfirm = () => {
    setShowConfirmPopup(false);
    pendingResolve?.(true);
    setPendingResolve(null);
  };

  const handleCancel = () => {
    setShowConfirmPopup(false);
    pendingResolve?.(false);
    setPendingResolve(null);
  };

  const doPasswordLogin = async () => {
    const email = loginEmail.trim().toLowerCase();
    const pw = loginPassword.trim();
    if (!email || !pw) {
      setLoginError("Enter your Creator Email and Password.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      if (!hasAllConfirmations) {
        const proceed = await new Promise<boolean>((resolve) => {
          setPendingResolve(() => resolve);
          setShowConfirmPopup(true);
        });
        if (!proceed) { setLoginLoading(false); return; }
      }

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portal: "creator", username: email, password: pw }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "invalid_credentials") {
          throw new Error("Creator Email or Password is incorrect.");
        }
        throw new Error(json?.error ?? "Login failed");
      }

      setTokens({ accessToken: json.accessToken });

      const profile = await apiFetch("/me");
      if (profile.role !== "creator") {
        const { clearTokens } = await import("../lib/api");
        clearTokens();
        throw new Error("This account is not a creator account.");
      }
      window.location.href = withBasePath("/creator/logged");
    } catch (err: any) {
      setLoginError(err.message ?? "Unable to sign in.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Girls Sign In — Bali Girls"
        description="Sign in to your Bali Girls creator account."
        path="/creator"
      />

      {/* ── Choice screen ──────────────────────────────────────────── */}
      {loginMode === "choice" ? (
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <div className="text-xs tracking-luxe text-brand-muted">GIRLS</div>
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
              Sign in using your Creator Email and Password.
            </p>
          </div>

          <a href={withBasePath("/creator/register")} className="btn btn-outline btn-block py-3 text-center block">
            REGISTER AS GIRL
          </a>
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
            portal="creator"
            label="GIRLS"
            defaultEmail="callista@email.com"
            defaultPassword="Admin@123"
            emailLabel="USER ID"
            emailPlaceholder="username@email.com"
            redirectPath="/creator/logged"
            roleCheck={(role) => role === "creator"}
            roleErrorMessage="This account is not a creator account."
            beforeLogin={beforeLogin}
            footer={
              <a href={withBasePath("/creator/register")} className="btn btn-outline btn-block py-3 text-center">
                REGISTER AS GIRL
              </a>
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
              <div className="text-xs tracking-luxe text-brand-muted">GIRLS</div>
              <h1 className="mt-2 font-display text-3xl">Sign In</h1>
            </div>

            <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
              <form onSubmit={(e) => { e.preventDefault(); doPasswordLogin(); }} className="space-y-4">
                <div>
                  <label className="text-xs tracking-[0.22em] text-brand-muted">CREATOR EMAIL</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="username@email.com"
                    type="email"
                    autoComplete="email"
                    aria-label="Creator email"
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
                  {loginLoading ? "SIGNING IN..." : "GIRLS SIGN IN"}
                </button>

                <div className="text-xs text-brand-muted text-center">
                  Sign in using your Creator Email and Password.
                </div>
              </form>
            </div>

            <a href={withBasePath("/creator/register")} className="btn btn-outline btn-block py-3 text-center">
              REGISTER AS GIRL
            </a>
          </div>
        </>
      ) : null}

      {/* ── Confirmation popup (shared across all modes) ──────────────── */}
      {showConfirmPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-brand-line bg-brand-surface p-6 shadow-luxe">
            <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTRATION CONFIRMATION</div>
            <h2 className="mt-2 font-display text-2xl">Confirm Before Signing</h2>
            <p className="mt-2 text-sm text-brand-muted">
              To continue, confirm platform policy and agreements for Terms of Use, Privacy Statement, and no nude
              photograph uploads.
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={policyConfirmed}
                  onChange={(e) => setPolicyConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-line"
                />
                <span>I confirm my registration/profile details follow platform policy.</span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={termsConfirmed}
                  onChange={(e) => setTermsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-line"
                />
                <span>I agree to the Terms of Use.</span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={privacyConfirmed}
                  onChange={(e) => setPrivacyConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-line"
                />
                <span>I agree to the Privacy Statement.</span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={noNudeConfirmed}
                  onChange={(e) => setNoNudeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-line"
                />
                <span>I confirm I will not upload nude photographs.</span>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={handleCancel}>
                CANCEL
              </button>
              <button type="button" className="btn btn-primary" disabled={!hasAllConfirmations} onClick={handleConfirm}>
                AGREE & CONTINUE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
