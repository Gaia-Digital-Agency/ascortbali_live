import { Link } from "react-router-dom";
import { PageMeta } from "../components/PageMeta";

// Public "AI & Technology" story page. Intentionally NOT indexed and NOT
// linked from the footer/sitemap (robots index={false}) — reachable by
// direct URL only. Frames the platform around the AI that builds and
// maintains it: the data pipeline and Charlie, the verification agent.
export default function InfoPage() {
  return (
    <div id="top" className="mx-auto max-w-3xl space-y-10 py-4">
      <PageMeta
        title={"AI & Technology — Bali Girls"}
        description={"How Bali Girls is built and kept real by AI — an automated content pipeline and Charlie, our WhatsApp verification agent."}
        path={"/info"}
        index={false}
      />

      <div className="text-center">
        <div className="text-xs tracking-luxe text-brand-muted">AI &amp; TECHNOLOGY</div>
        <h1 className="mt-2 font-display text-4xl">BUILT — AND KEPT REAL — BY AI</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-brand-muted">
          Bali Girls is more than a directory. From the first profile to the last
          verified phone number, the platform is assembled, cleaned, and maintained
          by a chain of AI systems working quietly in the background.
        </p>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-8 shadow-luxe">
        <p className="text-sm leading-relaxed text-brand-muted">
          Most listing sites are typed in by hand and left to rot. Ours is different:
          an automated content pipeline gathers and standardizes every profile, AI
          vision models prepare every photo, an automated safety audit screens the
          media, and a conversational agent reaches out to confirm that the people
          behind the profiles are real and reachable. The result is a directory that
          stays <span className="text-brand-text">free, real, and simple</span>.
        </p>
      </div>

      <InfoSection title="An AI-built directory">
        <p className="text-sm leading-relaxed text-brand-muted">
          Profiles don&apos;t start as polished pages — they start as scattered,
          inconsistent data. A pipeline of AI tools turns that raw material into the
          clean profiles you browse:
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-brand-muted">
          <Step n="01" title="Gather">
            Automated agents collect publicly available listing data, working through
            the usual web obstacles so nothing is missed.
          </Step>
          <Step n="02" title="Clean the images">
            Computer-vision models clean, restore, and standardize every photo so the
            gallery looks consistent and professional — no clutter, no distractions.
          </Step>
          <Step n="03" title="Understand &amp; select">
            AI vision reads each primary photo to fill in and correct profile
            attributes — ethnicity, hair, eyes — and selects the strongest images to
            feature.
          </Step>
          <Step n="04" title="Audit for safety">
            Every image passes through an automated content-safety check before it can
            go live, flagging anything unsuitable for review.
          </Step>
          <Step n="05" title="Structure &amp; publish">
            Cleaned data is normalized into the site&apos;s profile schema, paired with
            its media, and loaded to the live platform — ready to browse in seconds.
          </Step>
        </ul>
      </InfoSection>

      <InfoSection title="Meet Charlie — verification, by conversation">
        <p className="text-sm leading-relaxed text-brand-muted">
          A directory is only as good as it is real. <span className="text-brand-text">Charlie</span> is
          our AI verification agent. When a creator joins, Charlie reaches out over
          WhatsApp with a short, polite message and asks them to confirm the number is
          theirs.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">
          Charlie reads the reply, understands a simple <span className="text-brand-text">yes</span> or
          {" "}<span className="text-brand-text">no</span> in English or Bahasa Indonesia, thanks the
          person, and records the result — all on its own. It&apos;s how we keep contact
          details genuine and reachable instead of taking them on trust.
        </p>
      </InfoSection>

      <InfoSection title="Why it matters">
        <div className="grid gap-4 sm:grid-cols-3">
          <Pillar title="Real">
            Numbers are confirmed by a real conversation, not assumed.
          </Pillar>
          <Pillar title="Clean">
            Every photo is processed and safety-checked before it appears.
          </Pillar>
          <Pillar title="Fast">
            Automation does the heavy lifting, so the directory stays current.
          </Pillar>
        </div>
      </InfoSection>

      <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7">
        <h2 className="font-display text-xl">A note on AI</h2>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">
          AI here is a tool, not a gimmick — it removes busywork and raises quality, but
          people stay in control of what goes live. The platform is operated by a human
          team that reviews, approves, and has the final say on every profile.
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

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-brand-line bg-brand-surface/40 p-7 shadow-luxe">
      <h2 className="mb-4 font-display text-xl text-brand-text">{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="font-display text-brand-gold shrink-0">{n}</span>
      <span>
        <span className="text-brand-text">{title}.</span> {children}
      </span>
    </li>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-surface/40 p-4">
      <div className="font-display text-brand-gold">{title}</div>
      <p className="mt-2 text-xs leading-relaxed text-brand-muted">{children}</p>
    </div>
  );
}
