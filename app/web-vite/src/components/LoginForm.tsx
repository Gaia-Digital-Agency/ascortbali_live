import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  // Admin still logs in with username/password. User & creator are passwordless:
  // they log in with their WhatsApp number, then verify on WhatsApp.
  const passwordless = portal !== "admin";
  const [username, setUsername] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [phone, setPhone] = useState("");
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

  // 2FA state (WhatsApp-primary, SMS fallback)
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState("");
  const [smsMode, setSmsMode] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const navigate = useNavigate();

  // While awaiting WhatsApp verification, poll the session. The inbound webhook
  // flips it to "verified" once the user messages us from their registered
  // number; we then receive a one-time access token and finish sign-in.
  useEffect(() => {
    if (!twoFactorToken || smsMode) return;
    let active = true;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/2fa/wa/poll?token=${encodeURIComponent(twoFactorToken)}`);
        const json = await res.json();
        if (!active) return;
        if (json.status === "verified" && json.accessToken) {
          clearInterval(id);
          setTokens({ accessToken: json.accessToken });
          try {
            const profile = await apiFetch("/me");
            if (roleCheck && !roleCheck(profile.role)) {
              clearTokens();
              setError(roleErrorMessage);
              setTwoFactorToken(null);
              return;
            }
          } catch {
            /* ignore profile fetch hiccup; redirect will re-auth if needed */
          }
          window.location.href = withBasePath(redirectPath);
        } else if (json.status === "expired") {
          clearInterval(id);
          setError("Verification timed out. Please sign in again.");
          setTwoFactorToken(null);
        }
      } catch {
        /* transient network error — keep polling */
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twoFactorToken, smsMode]);

  const doLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = passwordless ? { phone, portal } : { username, password, portal };
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        // Passwordless: an unknown number on the user portal routes to register.
        if (passwordless && json?.error === "unknown_user") {
          if (portal === "user") {
            navigate("/user/register");
            return;
          }
          throw new Error("No account found for that WhatsApp number.");
        }
        // Admin (password) portal: distinguish unknown vs wrong password.
        if (portal === "user" && json?.error === "unknown_user") {
          navigate(`/user/register?email=${encodeURIComponent(username.trim())}`);
          return;
        }
        if (portal === "user" && json?.error === "invalid_password") {
          setShowForgot(true);
          setRecoverEmail(username.trim());
          setError("Incorrect password. Recover your account or set a new one below.");
          return;
        }
        throw new Error(json?.error ?? "Login failed");
      }

      // Handle 2FA challenge — WhatsApp-primary; SMS available as fallback.
      if (json.twoFactorRequired) {
        setTwoFactorToken(json.token);
        setWaNumber(json.waNumber || "");
        setSmsMode(false);
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

  // Fallback path: send the OTP code over SMS (Twilio Verify) and switch to the
  // code-entry view.
  const sendSms = async () => {
    if (!twoFactorToken) return;
    setSmsSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/sms/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: twoFactorToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error === "sms_unavailable" ? "SMS isn't available right now." : "Could not send the SMS code.");
      }
      setSmsMode(true);
      setOtpCode("");
    } catch (err: any) {
      setError(err.message ?? "Unable to send SMS.");
    } finally {
      setSmsSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!twoFactorToken || otpCode.length !== 6) return;
    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/sms/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: twoFactorToken, code: otpCode }),
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
  if (twoFactorToken) {
    const waDigits = waNumber.replace(/\D/g, "");
    const waText = `Verify my Bali Girls login — ${twoFactorToken} (please don't edit this message)`;
    const waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waText)}`;
    const resetTwoFactor = () => {
      setTwoFactorToken(null);
      setSmsMode(false);
      setOtpCode("");
      setError(null);
    };
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <div className="text-xs tracking-luxe text-brand-muted">{label}</div>
          <h1 className="mt-2 font-display text-3xl">Verify Identity</h1>
        </div>

        <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
          {!smsMode ? (
            <div className="space-y-4">
              <p className="text-sm text-brand-muted">
                Tap below to verify on WhatsApp. We&apos;ll confirm it&apos;s you from your registered number —
                no code to type. Just send the pre-filled message and return here.
              </p>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-block min-h-[44px] py-3 inline-flex items-center justify-center"
              >
                VERIFY ON WHATSAPP
              </a>

              <div className="flex items-center justify-center gap-2 text-xs text-brand-muted">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-gold" />
                Waiting for WhatsApp confirmation…
              </div>

              {error ? <div className="text-xs text-red-400">{error}</div> : null}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={smsSending}
                  onClick={sendSms}
                  className="min-h-[44px] text-brand-gold underline disabled:opacity-50"
                >
                  {smsSending ? "Sending…" : "Use SMS instead"}
                </button>
                <button
                  type="button"
                  onClick={resetTwoFactor}
                  className="min-h-[44px] text-brand-muted hover:text-brand-text"
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-muted">
                We sent a 6-digit code by SMS to your registered number. Enter it below to complete sign in.
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
                  disabled={smsSending}
                  onClick={sendSms}
                  className="min-h-[44px] text-brand-gold underline disabled:opacity-50"
                >
                  {smsSending ? "Sending…" : "Resend SMS"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmsMode(false);
                    setOtpCode("");
                    setError(null);
                  }}
                  className="min-h-[44px] text-brand-muted hover:text-brand-text"
                >
                  Back to WhatsApp
                </button>
              </div>
            </div>
          )}
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
          {passwordless ? (
            <>
              <div>
                <label className="text-xs tracking-[0.22em] text-brand-muted">WHATSAPP NUMBER</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-brand-line bg-brand-surface2/40 px-4 py-3 text-sm outline-none placeholder:text-brand-muted/60 focus:border-brand-gold/60"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812 3456 7890"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-label="WhatsApp number"
                />
                <p className="mt-2 text-xs text-brand-muted">
                  Enter the WhatsApp number on your account — we&apos;ll verify it on WhatsApp. No password needed.
                </p>
              </div>

              {error ? <div className="text-xs text-red-400">{error}</div> : null}

              <button
                disabled={loading || phone.replace(/\D/g, "").length < 8}
                className="btn btn-primary btn-block min-h-[44px] py-3"
              >
                {loading ? "CHECKING..." : "CONTINUE"}
              </button>

              {footer}
            </>
          ) : (
            <>
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
            </>
          )}
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
