import { Helmet } from "react-helmet-async";

// Single source of truth for the canonical host. Match the SSR fallback in
// server.ts so client- and server-rendered meta agree exactly.
const SITE_BASE = "https://baligirls.gaiada2.online";
const SITE_NAME = "Bali Girls";
const DEFAULT_OG_IMAGE = `${SITE_BASE}/og-image.png`;

/**
 * Per-page meta tags + canonical URL. Wrap one of these per route component.
 * The values overwrite the static defaults baked into index.html so each
 * route presents the right title / description / og:* / canonical to crawlers.
 *
 * Usage:
 *   <PageMeta
 *     title="Some page — Bali Girls"
 *     description="One-sentence summary."
 *     path="/some/path"
 *     image="https://.../hero.jpg"   // optional; defaults to /og-image.png
 *     index={false}                   // optional; default true
 *   />
 */
export function PageMeta({
  title,
  description,
  path,
  image,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  index?: boolean;
}) {
  const url = `${SITE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const og = image ?? DEFAULT_OG_IMAGE;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={og} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={og} />
      <link rel="canonical" href={url} />
      {/* Indexable by default. Pass index={false} to opt a route OUT of
          search-engine indexing (e.g. logged-in dashboards / admin). */}
      <meta name="robots" content={index ? "index, follow" : "noindex, nofollow"} />
    </Helmet>
  );
}

export { SITE_BASE, SITE_NAME, DEFAULT_OG_IMAGE };
