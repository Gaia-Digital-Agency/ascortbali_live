import { useState } from "react";
import { API_BASE, apiFetch, clearTokens, setTokens } from "../lib/api";
import { withBasePath } from "../lib/paths";

type Portal = "admin" | "user" | "creator";

type LoginFormProps = {
  portal: Portal;
  label: string;
  defaultEmail?: string;
  defaultPassword?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  redirectPath: string;
  roleCheck?: (role: string) => boolean;
  roleErrorMessage?: string;
  footer?: React.ReactNode;
  beforeLogin?: () => boolean | Promise<boolean>;
};

export function PasswordInput({
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisibility,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  visible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        className="w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 pr-16 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || "Password"}
      />
      <button
        type="button"
        className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-brand-muted hover:text-brand-text"
        onClick={onToggleVisibility}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default function LoginForm({
  portal,
  label,
  defaultEmail = "",
  defaultPassword = "",
  emailLabel = "EMAIL",
  emailPlaceholder = "username@email.com",
  redirectPath,
  roleCheck,
  roleErrorMessage = "This account does not have the required role.",
  footer,
  beforeLogin,
}: LoginFormProps) {
  const [username, setUsername] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [recoverName, setRecoverName] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverOldPassword, setRecoverOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoverOldPassword, setShowRecoverOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA state
  const [twoFactorSessionId, setTwoFactorSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResending, setOtpResending] = useState(false);

  const doLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, portal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Login failed");

      // Handle 2FA challenge
      if (json.twoFactorRequired) {
        setTwoFactorSessionId(json.sessionId);
        setOtpCode("");
        return;
      }

      setTokens({ accessToken: json.accessToken });

      const profile = await apiFetch("/me");
      if (roleCheck && !roleCheck(profile.role)) {
        clearTokens();
        throw new Error(roleErrorMessage);
      }
      window.location.href = withBasePath(redirectPath);
    } catch (err: any) {
      setError(err.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!twoFactorSessionId || otpCode.length !== 6) return;
    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: twoFactorSessionId, code: otpCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error === "invalid_otp" ? "Invalid or expired code. Please try again." : "Verification failed.");

      setTokens({ accessToken: json.accessToken });

      const profile = await apiFetch("/me");
      if (roleCheck && !roleCheck(profile.role)) {
        clearTokens();
        throw new Error(roleErrorMessage);
      }
      window.location.href = withBasePath(redirectPath);
    } catch (err: any) {
      setError(err.message ?? "Unable to verify code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!twoFactorSessionId) return;
    setOtpResending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/resend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: twoFactorSessionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error("Could not resend code.");
      setTwoFactorSessionId(json.sessionId);
      setOtpCode("");
    } catch (err: any) {
      setError(err.message ?? "Unable to resend code.");
    } finally {
      setOtpResending(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (beforeLogin) {
      const proceed = await beforeLogin();
      if (!proceed) return;
    }
    await doLogin();
  };

  const verifyRecovery = async () => {
    setRecoverLoading(true);
    setError(null);
    setRecoverMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          portal,
          name: recoverName,
          email: recoverEmail,
          phoneNumber: recoverPhone,
          oldPassword: recoverOldPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "verify_failed");
      setResetToken(String(json.resetToken));
      setRecoverMessage("Verification successful. Set your new password.");
    } catch (err: any) {
      if (err?.message === "need_two_fields") {
        setError("Provide at least 2 fields to verify identity.");
      } else if (err?.message === "invalid_recovery_data") {
        setError("Recovery details do not match our records.");
      } else {
        setError("Unable to verify recovery details.");
      }
    } finally {
      setRecoverLoading(false);
    }
  };

  const submitPasswordReset = async () => {
    const ok = /^[A-Za-z0-9]{8,}$/.test(newPassword);
    if (!ok) {
      setError("New password must be at least 8 characters, letters/numbers only (no symbols).");
      return;
    }
    if (!resetToken) {
      setError("Complete verification before resetting password.");
      return;
    }
    setRecoverLoading(true);
    setError(null);
    setRecoverMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "reset_failed");
      setPassword(newPassword);
      setRecoverMessage("Password reset successful. You can sign in now.");
      setShowForgot(false);
      setResetToken(null);
      setRecoverName("");
      setRecoverEmail("");
      setRecoverPhone("");
      setRecoverOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      if (err?.message === "invalid_new_password") {
        setError("New password must be at least 8 characters, letters/numbers only (no symbols).");
      } else if (err?.message === "invalid_reset_token") {
        setError("Reset session expired. Verify your details again.");
        setResetToken(null);
      } else {
        setError("Unable to reset password.");
      }
    } finally {
      setRecoverLoading(false);
    }
  };

  // 2FA OTP screen
  if (twoFactorSessionId) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <div className="text-xs tracking-luxe text-brand-muted">{label}</div>
          <h1 className="mt-2 font-display text-3xl">Verify Identity</h1>
        </div>

        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">
              We sent a 6-digit code to your WhatsApp. Enter it below to complete sign in.
            </p>

            <div>
              <label className="text-xs tracking-[0.22em] text-brand-muted">VERIFICATION CODE</label>
              <input
                className="mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-center text-lg tracking-[0.5em] outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                aria-label="Verification code"
              />
            </div>

            {error ? <div className="text-xs text-red-400">{error}</div> : null}

            <button
              disabled={otpLoading || otpCode.length !== 6}
              onClick={verifyOtp}
              className="btn btn-primary btn-block min-h-[44px] py-3"
            >
              {otpLoading ? "VERIFYING..." : "VERIFY CODE"}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={otpResending}
                onClick={resendOtp}
                className="min-h-[44px] text-brand-gold underline disabled:opacity-50"
              >
                {otpResending ? "Sending..." : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorSessionId(null);
                  setOtpCode("");
                  setError(null);
                }}
                className="min-h-[44px] text-brand-muted hover:text-brand-text"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">{label}</div>
        <h1 className="mt-2 font-display text-3xl">Sign In</h1>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">{emailLabel}</label>
            <input
              className="mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={emailPlaceholder}
              aria-label="Email"
            />
          </div>

          <div>
            <label className="text-xs tracking-[0.22em] text-brand-muted">PASSWORD</label>
            <PasswordInput
              className="mt-2"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisibility={() => setShowPassword((prev) => !prev)}
            />
          </div>

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button disabled={loading} className="btn btn-primary btn-block min-h-[44px] py-3">
            {loading ? "SIGNING IN..." : `${label} SIGN IN`}
          </button>

          <button
            type="button"
            className="btn btn-outline btn-block min-h-[44px] py-3"
            onClick={() => {
              setShowForgot((prev) => !prev);
              setError(null);
              setRecoverMessage(null);
            }}
          >
            FORGET PASSWORD
          </button>

          {footer}
        </form>

        {showForgot ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-brand-line bg-brand-surface2/30 p-4">
            <div className="text-xs tracking-[0.2em] text-brand-muted">VERIFY IDENTITY (ANY 2 MATCHED FIELDS)</div>
            <input
              className="w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-sm outline-none focus:border-brand-gold/60"
              value={recoverName}
              onChange={(e) => setRecoverName(e.target.value)}
              placeholder="Name"
              aria-label="Name"
            />
            <input
              className="w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-sm outline-none focus:border-brand-gold/60"
              value={recoverEmail}
              onChange={(e) => setRecoverEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
            />
            <input
              className="w-full rounded-xl border border-brand-line bg-brand-surface2/40 px-3 py-2 text-sm outline-none focus:border-brand-gold/60"
              value={recoverPhone}
              onChange={(e) => setRecoverPhone(e.target.value)}
              placeholder="Phone number"
              aria-label="Phone number"
            />
            <PasswordInput
              value={recoverOldPassword}
              onChange={setRecoverOldPassword}
              placeholder="Old password"
              visible={showRecoverOldPassword}
              onToggleVisibility={() => setShowRecoverOldPassword((prev) => !prev)}
            />
            <button type="button" disabled={recoverLoading} onClick={verifyRecovery} className="btn btn-outline btn-block py-2">
              {recoverLoading ? "VERIFYING..." : "VERIFY"}
            </button>

            {resetToken ? (
              <>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="New password (8+ alphanumeric)"
                  visible={showNewPassword}
                  onToggleVisibility={() => setShowNewPassword((prev) => !prev)}
                />
                <button
                  type="button"
                  disabled={recoverLoading}
                  onClick={submitPasswordReset}
                  className="btn btn-primary btn-block py-2"
                >
                  {recoverLoading ? "RESETTING..." : "RESET PASSWORD"}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {recoverMessage ? <div className="mt-3 text-xs text-emerald-400">{recoverMessage}</div> : null}
      </div>
    </div>
  );
}
