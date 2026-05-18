import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, setTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";
import { PageMeta } from "../components/PageMeta";
import { PasswordInput } from "../components/LoginForm";

// /creator/initial-login — onboarding entry point.
//
// Pairs the creator's phone number with the admin-issued temp_password.
// Backed by POST /auth/login/creator-initial, which:
//   - normalizes the phone the same way the SPA does (strip whitespace,
//     hyphens, parens) and matches against phone_number OR cell_phone
//   - increments providers.initial_login_uses on every successful match
//   - rejects with error="initial_login_exhausted" once the count hits 3
//
// After 3 uses the creator is steered toward /creator (normal login) or
// /creator/register. 2FA is skipped here — the trade-off is documented in
// the API handler.
export default function CreatorInitialLoginPage() {
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usesRemaining, setUsesRemaining] = useState<number | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUsesRemaining(null);
    if (!tempPassword) {
      setError("Enter the temporary password your administrator gave you.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/creator-initial`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tempPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === "initial_login_exhausted") {
          setError("This initial-login link has been used the maximum number of times. Please sign in normally or register a new account.");
        } else if (json?.error === "multiple_matches") {
          setError("That temporary password is shared by more than one account. Please use the normal sign-in.");
        } else {
          setError("Temporary password did not match our records.");
        }
        return;
      }
      setTokens({ accessToken: json.accessToken });
      if (typeof json.usesRemaining === "number") {
        setUsesRemaining(json.usesRemaining);
      }
      window.location.href = withBasePath("/creator/logged");
    } catch {
      setError("Unable to sign in right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageMeta
        title="Creator Initial Login — Bali Girls"
        description="First-time sign-in for creators using a phone number and temporary password."
        path="/creator/initial-login"
        index={false}
      />
      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">CREATOR</div>
        <h1 className="mt-2 font-display text-3xl">Initial Login</h1>
        <p className="mt-2 text-xs text-brand-muted">
          For first-time use only. Limited to 3 sign-ins; after that please
          use <Link to="/creator" className="text-brand-gold underline">normal login</Link> or
          <Link to="/creator/register" className="ml-1 text-brand-gold underline">register</Link>.
        </p>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">TEMPORARY PASSWORD</label>
            <PasswordInput
              className="mt-2"
              value={tempPassword}
              onChange={setTempPassword}
              visible={showPassword}
              onToggleVisibility={() => setShowPassword((p) => !p)}
              placeholder="Provided by your administrator"
            />
          </div>

          {error ? <div className="text-xs text-red-400">{error}</div> : null}
          {usesRemaining !== null ? (
            <div className="text-xs text-brand-muted">
              Signed in. {usesRemaining} initial-login use{usesRemaining === 1 ? "" : "s"} remaining.
            </div>
          ) : null}

          <button disabled={loading} className="btn btn-primary btn-block min-h-[44px] py-3">
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>

          <div className="text-center text-xs text-brand-muted">
            Already set a password?{" "}
            <Link to="/creator" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
              Use normal sign-in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
