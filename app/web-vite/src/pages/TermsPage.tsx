import { Link } from "react-router-dom";
import { PageMeta } from "../components/PageMeta";

export default function TermsPage() {
  return (
    <div id="top" className="mx-auto max-w-3xl space-y-10 py-4">
      <PageMeta
        title={"Terms of Use — Bali Girls"}
        description={"Terms and conditions for using the Bali Girls platform."}
        path={"/terms"}
        index={true}
      />

      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">LEGAL</div>
        <h1 className="mt-2 font-display text-4xl">Terms &amp; Conditions</h1>
        <p className="mt-3 text-xs text-brand-muted">Last Updated: March 04, 2026</p>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-8 shadow-luxe">
        <p className="text-sm leading-relaxed text-brand-muted">
          Welcome to <strong className="text-brand-text">Baligirls</strong> (the &ldquo;Site&rdquo;). By accessing or using
          this Site, you agree to be bound by these Terms and Conditions (&ldquo;T&amp;C&rdquo;). If you do not agree to
          these terms, please exit the Site immediately.
        </p>
      </div>

      <TcSection title="1. Technical Disclaimer & Role of Developer">
        <TcItem label="1.1 Technical Nature">
          This Site was developed and is maintained by{" "}
          <strong className="text-brand-text">[Web Development Company Name]</strong> (the &ldquo;Developer&rdquo;). The
          Developer&apos;s role is strictly limited to providing technical infrastructure, coding, and web hosting support.
        </TcItem>
        <TcItem label="1.2 Ownership and Control">
          The Developer does not own, operate, or control the business operations of Baligirls.
        </TcItem>
        <TcItem label="1.3 No Interaction">
          The Developer does not interact with end-users or content providers (Creators). The Developer does not curate,
          monitor, or endorse any content uploaded to the Site and is not responsible for any disputes, transactions, or
          interactions between users and creators.
        </TcItem>
      </TcSection>

      <TcSection title="2. User Responsibilities & Eligibility">
        <TcItem label="2.1 Age Requirement">
          This is a <strong className="text-brand-text">Rated R</strong> platform. You must be at least 18 years of age
          (or the age of majority in your jurisdiction, whichever is higher) to access this Site.
        </TcItem>
        <TcItem label="2.2 Responsibility for Actions">
          Users are solely responsible for their own actions while using the platform. You acknowledge that your
          engagement with content and other users is at your own risk.
        </TcItem>
        <TcItem label="2.3 Compliance">
          By using this Site, you agree to comply with all local, national, and international laws. You agree not to use
          the Site for any illegal purpose, including but not limited to harassment, fraud, or the distribution of
          prohibited material.
        </TcItem>
      </TcSection>

      <TcSection title="3. Creator Guidelines & Content Policy">
        <TcItem label="3.1 Content Standards">
          Creators are independent contractors and are not employees of the Site or the Developer.
        </TcItem>
        <TcItem label="3.2 Prohibited Content (No Full Nudity)">
          While the Site is Rated R,{" "}
          <strong className="text-brand-text">Full Nudity is strictly prohibited.</strong> This includes the explicit
          display of genitalia or unmasked sexual acts. Content must remain within the &ldquo;Rated R&rdquo; /
          &ldquo;Suggestive&rdquo; boundaries (e.g., lingerie, implied nudity, artistic photography).
        </TcItem>
        <TcItem label="3.3 Responsibility">
          Creators are solely responsible for the content they upload. Creators must ensure they have all necessary
          rights, releases, and age-verification documentation for any person appearing in their content.
        </TcItem>
        <TcItem label="3.4 Termination">
          Failure to comply with the &ldquo;No Full Nudity&rdquo; policy or other site terms will result in immediate
          removal of content and/or termination of the Creator&apos;s account without notice.
        </TcItem>
      </TcSection>

      <TcSection title="4. Rated R Content & Prohibited Conduct">
        <TcItem label="4.1 Nature of Content">
          Users acknowledge that they may be exposed to &ldquo;Mature&rdquo; or &ldquo;Rated R&rdquo; themes, including
          strong language and suggestive imagery.
        </TcItem>
        <TcItem label="4.2 Prohibited Materials">
          Regardless of the Rated R status, the following are strictly prohibited and will be reported to authorities
          where applicable:
          <ul className="mt-3 space-y-2 pl-4">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />
              <span>Child Sexual Abuse Material (CSAM) or any content involving minors.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />
              <span>Non-consensual sexual content (Revenge Porn).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />
              <span>Violence, gore, or illegal acts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />
              <span>Content depicting &ldquo;Full Nudity&rdquo; (as per Section 3.2).</span>
            </li>
          </ul>
        </TcItem>
      </TcSection>

      <TcSection title="5. Limitation of Liability">
        <p className="text-sm leading-relaxed text-brand-muted">
          To the maximum extent permitted by law, Baligirls and its technical Developers shall not be liable for any
          direct, indirect, incidental, or consequential damages resulting from the use or inability to use the site, or
          from the conduct of any third party on the site.
        </p>
      </TcSection>

      <TcSection title="6. Indemnification">
        <p className="text-sm leading-relaxed text-brand-muted">
          You agree to indemnify and hold harmless the Site owners and the Web Development Company from any claims,
          losses, or expenses (including legal fees) arising from your violation of these T&amp;Cs or your use of the
          platform.
        </p>
      </TcSection>

      <TcSection title="7. Amendments">
        <p className="text-sm leading-relaxed text-brand-muted">
          We reserve the right to modify these terms at any time. Continued use of the Site after changes are posted
          constitutes acceptance of the new terms.
        </p>
      </TcSection>

      <div className="rounded-3xl border border-brand-gold/60 bg-brand-surface/40 p-7 text-center">
        <p className="text-sm font-semibold leading-relaxed text-brand-text">
          BY CLICKING &ldquo;ENTER&rdquo; OR USING THIS SITE, YOU CONFIRM YOU ARE OVER 18 AND AGREE TO THE ABOVE TERMS.
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

function TcSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
      <h2 className="mb-5 font-display text-xl text-brand-text">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TcItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-[0.14em] text-brand-gold">{label}</div>
      <div className="text-sm leading-relaxed text-brand-muted">{children}</div>
    </div>
  );
}
