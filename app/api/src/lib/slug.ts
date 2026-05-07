// Slug helpers for creator profile URLs.
//
// Phase D (May 2026): /creator/preview/<slug> replaces /creator/preview/<uuid>
// for SEO. Slugs are generated on register and frozen for the lifetime of the
// creator's account so renames don't break inbound links / Search Console.

// We accept anything that has a `query(sql, params) => { rows }` method.
// In practice this is the PrismaSqlPool wrapper from lib/pg.ts (which mimics
// pg.Pool's API). Using a structural type here keeps slug.ts decoupled from
// the concrete pool implementation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlPool = { query: <R = any>(text: string, params?: any[]) => Promise<{ rows: R[] }> };

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/**
 * Convert a free-text creator name into a URL-safe slug.
 * - Lower-case.
 * - Runs of non-alphanumeric -> single hyphen.
 * - Strip leading/trailing hyphens.
 * - Cap at 120 chars (matches the providers.slug column length).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Build a unique slug for a new creator, looking up existing
 * providers.slug values that collide and appending -2 / -3 / … as needed.
 *
 * Returns the slug to insert. Caller must INSERT inside the same DB
 * transaction as the slug-uniqueness check or accept a small race
 * window — at the current 100-row scale that's fine.
 */
export async function uniqueCreatorSlug(pool: SqlPool, raw: string): Promise<string> {
  const base = slugify(raw);
  if (!base) throw new Error("empty_slug_base");
  const { rows } = await pool.query<{ slug: string }>(
    `SELECT slug FROM providers WHERE slug = $1 OR slug LIKE $1 || '-%'`,
    [base]
  );
  if (rows.length === 0) return base;
  let maxN = 1;
  let seenBase = false;
  for (const r of rows) {
    const s = String(r.slug);
    if (s === base) {
      seenBase = true;
      continue;
    }
    const m = s.match(/-(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  // If only the base existed without numbered variants, next is -2.
  return seenBase || maxN > 1 ? `${base}-${maxN + 1}` : base;
}
