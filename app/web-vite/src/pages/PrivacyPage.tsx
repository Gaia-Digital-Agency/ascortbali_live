import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div id="top" className="mx-auto max-w-3xl space-y-10 py-4">
      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">LEGAL</div>
        <h1 className="mt-2 font-display text-4xl">PRIVACY STATEMENT</h1>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-8 shadow-luxe">
        <p className="text-sm leading-relaxed text-brand-muted">
          This Privacy Statement explains how account, profile, and usage information is collected, used, and protected
          when you use this site.
        </p>
      </div>

      <PrivacySection title="Information We Collect">
        <p className="text-sm leading-relaxed text-brand-muted">
          We collect profile details, account credentials, and usage information required to operate the platform and
          support account access controls.
        </p>
      </PrivacySection>

      <PrivacySection title="How We Use Your Data">
        <p className="text-sm leading-relaxed text-brand-muted">
          Data is used only to deliver services, keep accounts secure, provide support, and improve platform operations.
        </p>
      </PrivacySection>

      <PrivacySection title="Contact">
        <p className="text-sm leading-relaxed text-brand-muted">
          For questions about data handling, contact the technical administrator for the site.
        </p>
      </PrivacySection>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <h2 className="font-display text-xl">Terms Reminder</h2>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">
          BY USING THIS SITE, YOU AGREE TO COMPLY WITH THE TERMS AND CONDITIONS AND THIS PRIVACY STATEMENT.
        </p>
      </div>

      <div className="pb-4">
        <Link to="/" className="btn btn-outline py-2 text-xs">
          {"← BACK TO HOME"}
        </Link>
      </div>
    </div>
  );
}

function PrivacySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-brand-line bg-brand-surface/40 p-7 shadow-luxe">
      <h2 className="mb-4 font-display text-xl text-brand-text">{title}</h2>
      <div>{children}</div>
    </div>
  );
}
