// This module defines routes for capturing and reporting visitor analytics.
import { Router } from "express";
import { z } from "zod";
import { hmacIp } from "../lib/security.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getPool } from "../lib/pg.js";
import { countryToRegion } from "../lib/regions.js";

export const analyticsRouter = Router();

// Flag to track if the analytics table has been created.
let analyticsTableReady = false;

// 30-second cache for the SUM(total_visits) aggregate. /analytics/status is
// hit on every page load via AnalyticsBeacon; the visitor count is shown for
// display only and 30s of staleness is invisible. Without this cache, every
// page view triggered a full-table SUM heap scan on visitor_analytics.
let totalVisitsCache: { value: number; expiresAt: number } | null = null;
const TOTAL_VISITS_TTL_MS = 30_000;

const VISITOR_COUNT_OFFSET = Number(process.env.VISITOR_COUNT_OFFSET ?? 12876);
const GEO_LOOKUP_PROVIDER = (process.env.ANALYTICS_GEO_LOOKUP ?? "ipwhois").toLowerCase();

type Geo = { city: string | null; country: string | null };

const GEO_CACHE_MAX = 10_000;
const geoCache = new Map<string, { expiresAt: number; geo: Geo }>();

/** Evict expired entries and trim to max size. */
function pruneGeoCache() {
  const now = Date.now();
  for (const [key, entry] of geoCache) {
    if (entry.expiresAt <= now) geoCache.delete(key);
  }
  // If still over limit, drop oldest entries (Map iterates in insertion order)
  if (geoCache.size > GEO_CACHE_MAX) {
    const excess = geoCache.size - GEO_CACHE_MAX;
    let i = 0;
    for (const key of geoCache.keys()) {
      if (i++ >= excess) break;
      geoCache.delete(key);
    }
  }
}

function isProbablyPublicIp(ip: string): boolean {
  const s = ip.trim().toLowerCase();
  if (!s) return false;
  if (s === "127.0.0.1" || s === "::1") return false;
  if (s.startsWith("10.")) return false;
  if (s.startsWith("192.168.")) return false;
  if (s.startsWith("172.")) {
    const part = Number(s.split(".")[1]);
    if (Number.isFinite(part) && part >= 16 && part <= 31) return false;
  }
  if (s.startsWith("169.254.")) return false;
  if (s.startsWith("fe80:") || s.startsWith("fc") || s.startsWith("fd")) return false; // link-local + unique-local v6
  return true;
}

function pickFirstHeaderIp(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const first = v.split(",")[0]?.trim();
  return first || null;
}

function getClientIp(req: { ip?: string; headers?: Record<string, unknown> }): string {
  const headers = (req.headers ?? {}) as Record<string, unknown>;

  // Common proxy/CDN headers (prefer explicit client IP if present).
  const cf = typeof headers["cf-connecting-ip"] === "string" ? headers["cf-connecting-ip"] : null;
  if (cf) return cf.trim();

  const xff = pickFirstHeaderIp(headers["x-forwarded-for"]);
  if (xff) return xff;

  const xri = typeof headers["x-real-ip"] === "string" ? headers["x-real-ip"] : null;
  if (xri) return xri.trim();

  return (req.ip || "0.0.0.0").trim();
}

function geoFromHeaders(req: { headers?: Record<string, unknown> }): Geo {
  const headers = (req.headers ?? {}) as Record<string, unknown>;
  const city = typeof headers["x-geo-city"] === "string" ? headers["x-geo-city"].trim() : null;
  const country =
    (typeof headers["x-geo-country"] === "string" ? headers["x-geo-country"].trim() : null) ||
    (typeof headers["cf-ipcountry"] === "string" ? headers["cf-ipcountry"].trim() : null);
  return { city: city || null, country: country || null };
}

async function lookupGeo(ip: string): Promise<Geo> {
  if (GEO_LOOKUP_PROVIDER === "off" || GEO_LOOKUP_PROVIDER === "false" || GEO_LOOKUP_PROVIDER === "0") {
    return { city: null, country: null };
  }
  if (!isProbablyPublicIp(ip)) return { city: null, country: null };

  const now = Date.now();
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > now) return cached.geo;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);
  try {
    let geo: Geo = { city: null, country: null };

    if (GEO_LOOKUP_PROVIDER === "ipapi") {
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: controller.signal });
      if (res.ok) {
        const j: any = await res.json();
        geo = {
          city: typeof j?.city === "string" ? j.city : null,
          country: typeof j?.country_name === "string" ? j.country_name : typeof j?.country === "string" ? j.country : null,
        };
      }
    } else {
      // Default: ipwho.is
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal });
      if (res.ok) {
        const j: any = await res.json();
        if (j?.success !== false) {
          geo = {
            city: typeof j?.city === "string" ? j.city : null,
            country: typeof j?.country === "string" ? j.country : null,
          };
        }
      }
    }

    // Cache even nulls to avoid hammering geo service.
    if (geoCache.size >= GEO_CACHE_MAX) pruneGeoCache();
    geoCache.set(ip, { expiresAt: now + 12 * 60 * 60 * 1000, geo });
    return geo;
  } catch {
    return { city: null, country: null };
  } finally {
    clearTimeout(timeout);
  }
}

// Ensures the visitor_analytics table exists. Called once at server boot
// (see app/api/src/index.ts) so it never sits on the request path.
export async function ensureAnalyticsTable() {
  if (analyticsTableReady) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_analytics (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ip_hash TEXT UNIQUE NOT NULL,
      country VARCHAR(80),
      city VARCHAR(80),
      user_agent VARCHAR(300),
      first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
      total_visits INTEGER NOT NULL DEFAULT 1
    )
  `);
  analyticsTableReady = true;
}

// Zod schema for validating visitor data.
const VisitSchema = z.object({
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  userAgent: z.string().max(300).optional().nullable(),
  // New: per-page-view fields
  visitorId: z.string().max(64).optional().nullable(),
  path: z.string().max(500).optional().nullable(),
  providerUuid: z.string().uuid().optional().nullable(),
  referer: z.string().max(500).optional().nullable(),
});

// Route to record a new visitor or update an existing one.
analyticsRouter.post("/visit", async (req, res) => {
  const parsed = VisitSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  try {
    const pool = getPool();
    const ip = getClientIp(req);
    const ipHash = hmacIp(ip);
    let country = parsed.data.country ?? null;
    let city = parsed.data.city ?? null;
    const userAgent = parsed.data.userAgent ?? null;

    // Best-effort: pick up geo from proxy headers or resolve via IP lookup.
    if (!city || !country) {
      const fromHeaders = geoFromHeaders(req);
      city = city ?? fromHeaders.city;
      country = country ?? fromHeaders.country;
    }
    if (!city || !country) {
      const fromIp = await lookupGeo(ip);
      city = city ?? fromIp.city;
      country = country ?? fromIp.country;
    }

    // Insert or update visitor data in the database.
    const result = await pool.query(
      `
      INSERT INTO visitor_analytics (ip_hash, country, city, user_agent, first_seen, last_seen, total_visits)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)
      ON CONFLICT (ip_hash) DO UPDATE SET
        country = COALESCE(EXCLUDED.country, visitor_analytics.country),
        city = COALESCE(EXCLUDED.city, visitor_analytics.city),
        user_agent = COALESCE(EXCLUDED.user_agent, visitor_analytics.user_agent),
        last_seen = NOW(),
        total_visits = visitor_analytics.total_visits + 1
      RETURNING id::text AS id
      `,
      [ipHash, country, city, userAgent]
    );

    let visitorId: string | null = result.rows[0]?.id ?? null;
    if (!visitorId) {
      const sel = await pool.query("SELECT id::text AS id FROM visitor_analytics WHERE ip_hash = $1 LIMIT 1", [ipHash]);
      visitorId = sel.rows[0]?.id ?? null;
    }

    // Per-page-view granular log (powers the admin dashboard metrics)
    try {
      const region = countryToRegion(country);
      const device = /Mobi|Android|iPhone/i.test(String(userAgent || "")) ? "mobile"
                   : /Tablet|iPad/i.test(String(userAgent || ""))         ? "tablet"
                   : "desktop";
      await pool.query(
        `INSERT INTO page_views (visitor_id, ip_hash, path, provider_uuid, country, region, device, referer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          parsed.data.visitorId ?? null,
          ipHash,
          parsed.data.path ?? "/",
          parsed.data.providerUuid ?? null,
          country,
          region,
          device,
          parsed.data.referer ?? null,
        ]
      );
    } catch { /* analytics is non-critical */ }

    return res.json({ visitorId });
  } catch {
    // Never crash API because analytics is non-critical
    return res.json({ visitorId: null });
  }
});

// Route to get the current visitor count and location.
analyticsRouter.get("/status", async (req, res) => {
  try {
    const pool = getPool();
    const ip = getClientIp(req);
    const ipHash = hmacIp(ip);

    // Get total visitor count and the current visitor's location. The
    // SUM(total_visits) aggregate is cached for TOTAL_VISITS_TTL_MS so the
    // hot path doesn't trigger a full-table heap scan per page load.
    const now = Date.now();
    const useCache = totalVisitsCache !== null && totalVisitsCache.expiresAt > now;
    const [countRes, visitorRes] = await Promise.all([
      useCache
        ? Promise.resolve(null)
        : pool.query("SELECT COALESCE(SUM(total_visits), 0)::bigint AS count FROM visitor_analytics"),
      pool.query("SELECT city, country FROM visitor_analytics WHERE ip_hash = $1 LIMIT 1", [ipHash]),
    ]);
    let totalVisitsRaw: number;
    if (useCache && totalVisitsCache) {
      totalVisitsRaw = totalVisitsCache.value;
    } else {
      totalVisitsRaw = Number((countRes as { rows: Array<{ count: number | string }> })?.rows[0]?.count ?? 0);
      totalVisitsCache = { value: totalVisitsRaw, expiresAt: now + TOTAL_VISITS_TTL_MS };
    }
    const visitorCount = totalVisitsRaw + (Number.isFinite(VISITOR_COUNT_OFFSET) ? VISITOR_COUNT_OFFSET : 0);
    const visitor = visitorRes.rows[0];
    let city = (visitor?.city as string | null | undefined) ?? null;
    let country = (visitor?.country as string | null | undefined) ?? null;

    if (!city || !country) {
      const fromHeaders = geoFromHeaders(req);
      city = city ?? fromHeaders.city;
      country = country ?? fromHeaders.country;
    }

    if ((!city || !country) && visitor) {
      const fromIp = await lookupGeo(ip);
      const nextCity = city ?? fromIp.city;
      const nextCountry = country ?? fromIp.country;
      if (nextCity || nextCountry) {
        city = nextCity;
        country = nextCountry;
        await pool.query(
          "UPDATE visitor_analytics SET city = COALESCE($1, city), country = COALESCE($2, country) WHERE ip_hash = $3",
          [city, country, ipHash]
        );
      }
    }

    const location = [city, country].filter(Boolean).join(", ") || "Unknown";

    return res.json({ visitorCount, ip, location });
  } catch {
    return res.json({ visitorCount: Number.isFinite(VISITOR_COUNT_OFFSET) ? VISITOR_COUNT_OFFSET : 0, ip: req.ip || "0.0.0.0", location: "Unknown" });
  }
});

// Zod schema for validating link data.
const LinkSchema = z.object({
  visitorId: z.string().uuid(),
});

// Route to link a visitor ID to a user ID.
analyticsRouter.post("/link", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = LinkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  // This MVP keeps link as no-op to avoid schema mismatch with legacy Prisma models.
  return res.json({ ok: true, userId: req.user!.id, visitorId: parsed.data.visitorId });
});
