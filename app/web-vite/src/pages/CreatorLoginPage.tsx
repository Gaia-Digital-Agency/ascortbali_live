import { useState, useCallback } from "react";
import { withBasePath } from "../lib/paths";
import LoginForm from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";

export default function CreatorLoginPage() {
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [tncConfirmed, setTncConfirmed] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<((v: boolean) => void) | null>(null);

  const hasAllConfirmations = tncConfirmed;

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

  return (
    <>
      <PageMeta
        title="Girls Sign In — Bali Girls"
        description="Sign in to your Bali Girls creator account."
        path="/creator"
      />
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
          <>
            <a href={withBasePath("/creator/register")} className="btn btn-outline btn-block py-3 text-center">
              REGISTER AS GIRL
            </a>
            <div className="text-xs text-brand-muted">
              Sign in with your registered WhatsApp number — we&apos;ll verify you on WhatsApp. No password needed.
            </div>
          </>
        }
      />

      {showConfirmPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-brand-line bg-brand-surface p-6 shadow-luxe">
            <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTRATION CONFIRMATION</div>
            <h2 className="mt-2 font-display text-2xl">Confirm Before Signing</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Please confirm you have read and accepted the terms, conduct and privacy policy of this site.
            </p>

            <div className="mt-5 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={tncConfirmed}
                  onChange={(e) => setTncConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-line"
                />
                <span>I have read and accepted the terms, conduct and privacy policy of this site; and shall not post nudity.</span>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!hasAllConfirmations}
                onClick={handleConfirm}
              >
                AGREE & CONTINUE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
