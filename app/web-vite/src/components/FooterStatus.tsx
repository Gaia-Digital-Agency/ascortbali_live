import { Link } from "react-router-dom";

export function FooterStatus() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap justify-center gap-3 text-sm tracking-[0.18em] text-brand-muted">
        <Link
          to="/terms"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-brand-line px-4 py-2 underline underline-offset-2 hover:text-brand-gold"
        >
          Terms &amp; Condition
        </Link>
        <Link
          to="/privacy"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-brand-line px-4 py-2 underline underline-offset-2 hover:text-brand-gold"
        >
          Privacy Statement
        </Link>
        <Link
          to="/blog"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-brand-line px-4 py-2 underline underline-offset-2 hover:text-brand-gold"
        >
          Blog
        </Link>

      </div>

      {/* Legal disclaimer — discreet, centered at the very bottom */}
      <p className="mt-8 text-[11px] leading-relaxed text-brand-muted/70 text-center max-w-4xl mx-auto">
        This Website is an advertising and information resource, and as such has no connection or liability with any of the sites or individuals mentioned here. We ONLY sell advertisement space, we are not an escort agency, nor we are in any way involved in escorting or prostitution business. We take no responsibility for the content or actions of third party websites or individuals that you may access following links, email or phone contacts from this portal.
      </p>
    </div>
  );
}
