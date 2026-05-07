// Defines routes for fetching creator data.
import { Router } from "express";
import { getPool } from "../lib/pg.js";

export const creatorsRouter = Router();

// Same shape as the list query — the frontend treats a "creator card" as
// these columns plus the resolved primary image. Used by /, /random, /by-names.
const CARD_COLUMNS = `p.uuid,
       p.provider_id,
       p.title,
       p.model_name,
       p.is_active,
       p.age,
       p.gender,
       p.nationality,
       p.orientation,
       p.height,
       p.bust_size,
       p.city,
       p.country,
       p.url,
       p.username,
       img.image_file`;

// Reusable LATERAL join that picks the first non-empty image for each provider.
// Indexed by idx_provider_images_uuid_seq_id (P1).
const PRIMARY_IMAGE_LATERAL = `LEFT JOIN LATERAL (
       SELECT image_file
         FROM provider_images
        WHERE provider_uuid = p.uuid
          AND image_file IS NOT NULL
          AND BTRIM(image_file) <> ''
        ORDER BY sequence_number ASC, image_id ASC
        LIMIT 1
     ) AS img ON true`;

// Map age-band UI strings to a SQL BETWEEN range. Mirrors ageBand() in
// app/web-vite/src/pages/HomePage.tsx.
function ageBandToRange(band: string | null): { min: number; max: number } | null {
  switch ((band ?? "").trim().toLowerCase()) {
    case "18-24": return { min: 18, max: 24 };
    case "25-29": return { min: 25, max: 29 };
    case "30-34": return { min: 30, max: 34 };
    case "35+":   return { min: 35, max: 200 };
    default: return null;
  }
}

// Cached filter options. /creators/filter-options is hit on every homepage
// load; the result only changes when admins add/remove creators or update
// nationality/height fields. 60s TTL keeps it cheap without being stale.
let filterOptionsCache: {
  payload: { nationalities: string[]; heights: string[] };
  expiresAt: number;
} | null = null;
const FILTER_OPTIONS_TTL_MS = 60_000;

// ── Specific routes BEFORE the /:uuid catch-all ────────────────────────────

// GET /creators/filter-options
//   Returns distinct nationality + height values from active creators for the
//   homepage filter dropdowns. Tiny payload, 60s in-memory cache.
creatorsRouter.get("/filter-options", async (_req, res) => {
  const now = Date.now();
  if (filterOptionsCache && filterOptionsCache.expiresAt > now) {
    return res.json(filterOptionsCache.payload);
  }
  const pool = getPool();
  try {
    const [natRes, htRes] = await Promise.all([
      pool.query(
        `SELECT DISTINCT BTRIM(nationality) AS v
           FROM providers
          WHERE is_active IS TRUE
            AND nationality IS NOT NULL
            AND BTRIM(nationality) <> ''
          ORDER BY v ASC`
      ),
      pool.query(
        `SELECT DISTINCT BTRIM(height) AS v
           FROM providers
          WHERE is_active IS TRUE
            AND height IS NOT NULL
            AND BTRIM(height) <> ''
          ORDER BY v ASC`
      ),
    ]);
    const payload = {
      nationalities: natRes.rows.map((r: { v: string }) => r.v),
      heights: htRes.rows.map((r: { v: string }) => r.v),
    };
    filterOptionsCache = { payload, expiresAt: now + FILTER_OPTIONS_TTL_MS };
    return res.json(payload);
  } catch (err) {
    console.error("GET /creators/filter-options failed", err);
    return res.status(500).json({ error: "Failed to load filter options" });
  }
});

// GET /creators/random?n=8&exclude=<uuid>
//   Returns up to N random active creators (with primary image), optionally
//   excluding one uuid. Used by CreatorPreviewPage's "Explore Next Girl".
//   ORDER BY RANDOM() is fine at the current 100-row scale; if `providers`
//   grows past ~10k active rows, switch to TABLESAMPLE or pre-sample IDs.
creatorsRouter.get("/random", async (req, res) => {
  const n = Math.min(Math.max(Number(req.query.n ?? 8), 1), 24);
  const excludeRaw = (req.query.exclude as string | undefined)?.trim();
  // Validate uuid format strictly to avoid SQL injection via parameter typing.
  const excludeUuid =
    excludeRaw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(excludeRaw)
      ? excludeRaw
      : null;
  const pool = getPool();
  try {
    const params: Array<number | string> = [n];
    let where = "WHERE p.is_active IS TRUE AND img.image_file IS NOT NULL";
    if (excludeUuid) {
      params.push(excludeUuid);
      where += ` AND p.uuid <> $${params.length}::uuid`;
    }
    const rowsRes = await pool.query(
      `SELECT ${CARD_COLUMNS}
         FROM providers p
         ${PRIMARY_IMAGE_LATERAL}
        ${where}
        ORDER BY RANDOM()
        LIMIT $1`,
      params
    );
    return res.json({ items: rowsRes.rows });
  } catch (err) {
    console.error("GET /creators/random failed", err);
    return res.status(500).json({ error: "Failed to load random creators" });
  }
});

// GET /creators/by-names?names=alice,bob,carol
//   Returns active creators matching any of the given model_names
//   (case-insensitive). Used by FeaturedCarousel for the 4 featured girls.
//   Caps the input at 10 names to keep the IN list bounded.
creatorsRouter.get("/by-names", async (req, res) => {
  const raw = (req.query.names as string | undefined) ?? "";
  const names = raw
    .split(",")
    .map((n) => decodeURIComponent(n).trim())
    .filter(Boolean)
    .slice(0, 10);
  if (names.length === 0) {
    return res.json({ items: [] });
  }
  const pool = getPool();
  try {
    // Lowercase comparison via ANY($1::text[]) — pass an array param for
    // safety (no string interpolation).
    const lower = names.map((n) => n.toLowerCase());
    const rowsRes = await pool.query(
      `SELECT ${CARD_COLUMNS}
         FROM providers p
         ${PRIMARY_IMAGE_LATERAL}
        WHERE p.is_active IS TRUE
          AND LOWER(BTRIM(p.model_name)) = ANY($1::text[])`,
      [lower]
    );
    return res.json({ items: rowsRes.rows });
  } catch (err) {
    console.error("GET /creators/by-names failed", err);
    return res.status(500).json({ error: "Failed to load creators by name" });
  }
});

// GET /creators?page=N&limit=L&nationality=X&age=Y&height=Z
//   Paginated + filtered list. The homepage now passes filters server-side
//   instead of fetching 500 rows and slicing client-side.
creatorsRouter.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 25), 1), 500);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const offset = (page - 1) * limit;
  const nationality = (req.query.nationality as string | undefined)?.trim() || null;
  const heightFilter = (req.query.height as string | undefined)?.trim() || null;
  const ageRange = ageBandToRange((req.query.age as string | undefined) ?? null);
  const pool = getPool();
  try {
    const conds: string[] = ["p.is_active IS TRUE"];
    const filterParams: Array<string | number> = [];
    if (nationality) {
      filterParams.push(nationality.toLowerCase());
      conds.push(`LOWER(BTRIM(p.nationality)) = $${filterParams.length}`);
    }
    if (heightFilter) {
      filterParams.push(heightFilter.toLowerCase());
      conds.push(`LOWER(BTRIM(p.height)) = $${filterParams.length}`);
    }
    if (ageRange) {
      filterParams.push(ageRange.min);
      conds.push(`p.age >= $${filterParams.length}`);
      filterParams.push(ageRange.max);
      conds.push(`p.age <= $${filterParams.length}`);
    }
    const whereClause = conds.join(" AND ");
    const rowsParams = [...filterParams, limit, offset];
    const limitPlaceholder = `$${filterParams.length + 1}`;
    const offsetPlaceholder = `$${filterParams.length + 2}`;

    const [rowsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT ${CARD_COLUMNS}
           FROM providers p
           ${PRIMARY_IMAGE_LATERAL}
          WHERE ${whereClause}
          ORDER BY (img.image_file IS NULL) ASC, p.created_at DESC
          LIMIT ${limitPlaceholder}
         OFFSET ${offsetPlaceholder}`,
        rowsParams
      ),
      // SCALABILITY NOTE: COUNT(*) does a heap scan per page request. Fine at
      // the current 100-row scale; if `providers` grows past ~50–100k active
      // rows, switch to a planner-estimate fallback (P20 in the perf audit).
      pool.query(
        `SELECT COUNT(*)::int AS total FROM providers p WHERE ${whereClause}`,
        filterParams
      ),
    ]);
    return res.json({
      items: rowsRes.rows,
      page,
      pageSize: limit,
      total: countRes.rows[0]?.total ?? 0,
    });
  } catch (err) {
    console.error("GET /creators failed", err);
    return res.status(500).json({ error: "Failed to load creators" });
  }
});

// GET /creators/:uuid — MUST come last (Express matches in declaration order;
// /:uuid would otherwise eat /random, /by-names, /filter-options).
creatorsRouter.get("/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const pool = getPool();
  try {
    // Query for the creator's details. Explicit column list (P13) — the
    // frontend (CreatorPreviewPage.tsx) only reads these fields. Was
    // SELECT p.* which shipped all 47 columns including large text bodies
    // (notes, tour, provides, etc.) on every detail view.
    const creatorRes = await pool.query(
      `SELECT p.uuid,
              p.username,
              p.model_name,
              p.age,
              p.gender,
              p.nationality,
              p.languages,
              p.city,
              p.country,
              p.location,
              p.wechat_id,
              p.hair_color,
              p.hair_length,
              p.height,
              p.weight,
              p.meeting_with,
              p.services,
              p.phone_number,
              p.cell_phone,
              p.telegram_id
         FROM providers p
        WHERE p.uuid = $1::uuid
          AND p.is_active IS TRUE`,
      [uuid]
    );
    if (creatorRes.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    // Query for all of the creator's images.
    const imagesRes = await pool.query(
      `SELECT image_id, image_file, sequence_number
         FROM provider_images
        WHERE provider_uuid = $1::uuid
        ORDER BY sequence_number ASC, image_id ASC`,
      [uuid]
    );

    return res.json({
      creator: creatorRes.rows[0],
      images: imagesRes.rows,
    });
  } catch (err) {
    console.error("GET /creators/:uuid failed", { uuid, err });
    return res.status(500).json({ error: "Failed to load creator" });
  }
});
