// Defines routes for fetching creator data.
import { Router } from "express";
import { getPool } from "../lib/pg.js";
import { isUuid } from "../lib/slug.js";

export const creatorsRouter = Router();

// Same shape as the list query — the frontend treats a "creator card" as
// these columns plus the resolved primary image. Used by /, /random, /by-names.
const CARD_COLUMNS = `p.uuid,
       p.provider_id,
       p.title,
       p.model_name,
       p.slug,
       p.is_active,
       p.age,
       p.gender,
       p.nationality,
       p.orientation,
       p.height,
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
//
// `heights` returns 2-inch bands (e.g. 5'0"-5'1") with a corresponding cm
// range, not individual cm values. The frontend stores the band's min
// inches as the URL value (e.g. ?height=64) and the GET /creators handler
// converts that back to a cm BETWEEN range.
type HeightBand = { value: string; label: string; minCm: number; maxCm: number };
const HEIGHT_BANDS: HeightBand[] = [
  { value: "56", label: '4\'8" - 4\'9" / 142-146 cm',   minCm: 142, maxCm: 146 },
  { value: "58", label: '4\'10" - 4\'11" / 147-151 cm', minCm: 147, maxCm: 151 },
  { value: "60", label: '5\'0" - 5\'1" / 152-156 cm',   minCm: 152, maxCm: 156 },
  { value: "62", label: '5\'2" - 5\'3" / 157-162 cm',   minCm: 157, maxCm: 162 },
  { value: "64", label: '5\'4" - 5\'5" / 163-167 cm',   minCm: 163, maxCm: 167 },
  { value: "66", label: '5\'6" - 5\'7" / 168-172 cm',   minCm: 168, maxCm: 172 },
  { value: "68", label: '5\'8" - 5\'9" / 173-177 cm',   minCm: 173, maxCm: 177 },
  { value: "70", label: '5\'10" - 5\'11" / 178-182 cm', minCm: 178, maxCm: 182 },
  { value: "72", label: '6\'0" - 6\'1" / 183-187 cm',   minCm: 183, maxCm: 187 },
  { value: "74", label: '6\'2" - 6\'3" / 188-192 cm',   minCm: 188, maxCm: 192 },
];
type HeightOption = { value: string; label: string };

let filterOptionsCache: {
  payload: {
    nationalities: string[];
    heights: HeightOption[];
    genders: string[];
    serviceAreas: string[];
    categories: string[];
  };
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
    const [natRes, htRes, genderRes, areaRes, catRes] = await Promise.all([
      pool.query(
        `SELECT DISTINCT BTRIM(nationality) AS v
           FROM providers
          WHERE is_active IS TRUE
            AND nationality IS NOT NULL
            AND BTRIM(nationality) <> ''
          ORDER BY v ASC`
      ),
      // Heights: pull distinct cm values (parsed out of the formatted string,
      // e.g. "162 cm / 5'4\"" -> 162). We bucket these into 2-inch bands
      // client-side below so the dropdown shows ranges, not individual cm.
      pool.query(
        `SELECT DISTINCT
                CAST(substring(BTRIM(height) from '^([0-9]+)') AS INT) AS cm
           FROM providers
          WHERE is_active IS TRUE
            AND height IS NOT NULL
            AND BTRIM(height) <> ''
            AND substring(BTRIM(height) from '^([0-9]+)') IS NOT NULL
          ORDER BY cm ASC`
      ),
      // Gender column has mixed casing ("Female" / "female" coexist) — fold
      // to lower so we don't show two entries for the same gender.
      pool.query(
        `SELECT DISTINCT LOWER(BTRIM(gender)) AS v
           FROM providers
          WHERE is_active IS TRUE
            AND gender IS NOT NULL
            AND BTRIM(gender) <> ''
          ORDER BY v ASC`
      ),
      // city stores comma-separated Bali zones (e.g. "Ubud, Canggu") since
      // the Service Area picker landed. unnest splits the list, BTRIM trims
      // surrounding whitespace, DISTINCT folds duplicates.
      pool.query(
        `SELECT DISTINCT BTRIM(zone) AS v
           FROM providers,
                LATERAL unnest(string_to_array(city, ',')) AS zone
          WHERE is_active IS TRUE
            AND city IS NOT NULL
            AND BTRIM(city) <> ''
            AND BTRIM(zone) <> ''
          ORDER BY v ASC`
      ),
      // Category = escort_type (Freelance / Escort once Phase E backfills,
      // plus any legacy values like "Pornstar" that already exist).
      pool.query(
        `SELECT DISTINCT LOWER(BTRIM(escort_type)) AS v
           FROM providers
          WHERE is_active IS TRUE
            AND escort_type IS NOT NULL
            AND BTRIM(escort_type) <> ''
          ORDER BY v ASC`
      ),
    ]);
    // Bucket the distinct cm values into the 2-inch bands defined above.
    // A band appears in the dropdown only if at least one active creator
    // falls inside it — keeps the menu short.
    const cmValues = (htRes.rows as Array<{ cm: number | null }>)
      .map((r) => Number(r.cm))
      .filter((n) => Number.isFinite(n) && n > 0);
    const populatedHeights: HeightOption[] = HEIGHT_BANDS
      .filter((b) => cmValues.some((cm) => cm >= b.minCm && cm <= b.maxCm))
      .map((b) => ({ value: b.value, label: b.label }));

    const payload = {
      nationalities: natRes.rows.map((r: { v: string }) => r.v),
      heights: populatedHeights,
      genders: genderRes.rows.map((r: { v: string }) => r.v),
      serviceAreas: areaRes.rows.map((r: { v: string }) => r.v),
      categories: catRes.rows.map((r: { v: string }) => r.v),
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
//                &gender=X&serviceArea=X&category=X
//   Paginated + filtered list. The homepage passes filters server-side
//   instead of fetching 500 rows and slicing client-side.
creatorsRouter.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 25), 1), 500);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const offset = (page - 1) * limit;
  const nationality = (req.query.nationality as string | undefined)?.trim() || null;
  const heightFilter = (req.query.height as string | undefined)?.trim() || null;
  const ageRange = ageBandToRange((req.query.age as string | undefined) ?? null);
  const gender = (req.query.gender as string | undefined)?.trim() || null;
  const serviceArea = (req.query.serviceArea as string | undefined)?.trim() || null;
  const category = (req.query.category as string | undefined)?.trim() || null;
  const pool = getPool();
  try {
    const conds: string[] = ["p.is_active IS TRUE"];
    const filterParams: Array<string | number> = [];
    if (nationality) {
      filterParams.push(nationality.toLowerCase());
      conds.push(`LOWER(BTRIM(p.nationality)) = $${filterParams.length}`);
    }
    if (heightFilter) {
      // heightFilter is the band's min-inches token (e.g. "64" for 5'4"-5'5").
      // Look up the band and run a BETWEEN against the parsed cm value of
      // the height column. Unknown tokens silently fall through (no filter).
      const band = HEIGHT_BANDS.find((b) => b.value === heightFilter);
      if (band) {
        filterParams.push(band.minCm);
        const minPh = `$${filterParams.length}`;
        filterParams.push(band.maxCm);
        const maxPh = `$${filterParams.length}`;
        conds.push(
          `CAST(substring(BTRIM(p.height) from '^([0-9]+)') AS INT) BETWEEN ${minPh} AND ${maxPh}`
        );
      }
    }
    if (ageRange) {
      filterParams.push(ageRange.min);
      conds.push(`p.age >= $${filterParams.length}`);
      filterParams.push(ageRange.max);
      conds.push(`p.age <= $${filterParams.length}`);
    }
    if (gender) {
      // Match LOWER(gender) — tolerates the existing "Female" / "female" mix.
      filterParams.push(gender.toLowerCase());
      conds.push(`LOWER(BTRIM(p.gender)) = $${filterParams.length}`);
    }
    if (serviceArea) {
      // city is a comma-separated zone list; match the requested zone as one
      // of those entries (case-insensitive, whitespace-trimmed).
      filterParams.push(serviceArea.toLowerCase());
      conds.push(`EXISTS (
        SELECT 1 FROM unnest(string_to_array(p.city, ',')) AS z
         WHERE LOWER(BTRIM(z)) = $${filterParams.length}
      )`);
    }
    if (category) {
      filterParams.push(category.toLowerCase());
      conds.push(`LOWER(BTRIM(p.escort_type)) = $${filterParams.length}`);
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

// GET /creators/:idOrSlug — MUST come last (Express matches in declaration
// order; /:param would otherwise eat /random, /by-names, /filter-options).
//
// Accepts either a UUID or a slug. UUID is detected via the standard 8-4-4-4-12
// hex pattern; everything else is treated as a slug. Returning the slug in
// the response lets the frontend reuse it for canonical link composition.
creatorsRouter.get("/:idOrSlug", async (req, res) => {
  const { idOrSlug } = req.params;
  const isLookupByUuid = isUuid(idOrSlug);
  const pool = getPool();
  try {
    // Query for the creator's details. Explicit column list — the frontend
    // (CreatorPreviewPage.tsx) only reads these fields. SELECT p.* shipped
    // all 47 columns including large text bodies (notes, tour, provides).
    const creatorRes = await pool.query(
      `SELECT p.uuid,
              p.username,
              p.model_name,
              p.slug,
              p.age,
              p.gender,
              p.nationality,
              p.ethnicity,
              p.languages,
              p.city,
              p.country,
              p.location,
              p.wechat_id,
              p.hair_color,
              p.hair_length,
              p.eyes,
              p.height,
              p.weight,
              p.travel,
              p.meeting_with,
              p.available_for,
              p.orientation,
              p.smoker,
              p.tattoo,
              p.piercing,
              p.services,
              p.notes,
              p.phone_number,
              p.cell_phone,
              p.telegram_id,
              p.escort_type AS form
         FROM providers p
        WHERE ${isLookupByUuid ? "p.uuid = $1::uuid" : "p.slug = $1"}
          AND p.is_active IS TRUE`,
      [idOrSlug]
    );
    if (creatorRes.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    // Look up images by the resolved creator's uuid (works whether the
    // route was hit by UUID or slug — we already have the row).
    const creatorUuid = creatorRes.rows[0].uuid as string;
    const imagesRes = await pool.query(
      `SELECT image_id, image_file, sequence_number
         FROM provider_images
        WHERE provider_uuid = $1::uuid
        ORDER BY sequence_number ASC, image_id ASC`,
      [creatorUuid]
    );

    return res.json({
      creator: creatorRes.rows[0],
      images: imagesRes.rows,
    });
  } catch (err) {
    console.error("GET /creators/:idOrSlug failed", { idOrSlug, err });
    return res.status(500).json({ error: "Failed to load creator" });
  }
});
