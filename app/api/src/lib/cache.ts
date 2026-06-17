// Redis-backed response cache for public, read-only GET endpoints.
//
// Design goals:
//   * FAIL-OPEN — Redis being slow/down must NEVER 500 the API or block a
//     response. Any error degrades to a normal cache-miss (direct DB read).
//   * Zero per-route logic — `cacheGet(ttl)` is dropped in as middleware on
//     the specific public GETs we want cached; everything else is untouched.
//   * Shared across processes/restarts (unlike the per-process in-memory
//     caches already used in a few routes).
import type { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";

// Namespaced so these keys never collide with other apps on the shared
// Redis instance (e.g. gaiadaweb uses "gaiadaweb:*").
const PREFIX = "baligirls:api:resp:";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      lazyConnect: true, // connect on first command, not at import time
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false, // don't buffer commands while disconnected
    });
    redis.on("error", (err: Error) => {
      // Best-effort cache: log and keep serving from Postgres.
      console.error("[cache] redis error:", err?.message || err);
    });
  }
  return redis;
}

/**
 * Caching middleware for public GET endpoints.
 *
 * On a hit, returns the cached JSON immediately (X-Cache: HIT). On a miss,
 * transparently captures the JSON the handler sends and stores it for
 * `ttlSeconds` (X-Cache: MISS). Only 2xx responses are cached, so 404s and
 * errors are never served stale. Non-GET requests pass straight through.
 */
export function cacheGet(ttlSeconds: number) {
  return async function cacheGetMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (req.method !== "GET") return next();

    const r = getRedis();
    if (!r) return next();

    const key = PREFIX + req.originalUrl;

    try {
      const hit = await r.get(key);
      if (hit) {
        res.setHeader("X-Cache", "HIT");
        res.type("application/json").send(hit);
        return;
      }
    } catch (err) {
      // Redis unreachable/slow — fall through to the handler (fail-open).
      console.error("[cache] get failed:", (err as Error)?.message || err);
      return next();
    }

    // Miss: wrap res.json so we capture the payload the handler produces.
    res.setHeader("X-Cache", "MISS");
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const payload = JSON.stringify(body);
          // Fire-and-forget: never block the client on the cache write.
          void r
            .set(key, payload, "EX", ttlSeconds)
            .catch((err: Error) =>
              console.error("[cache] set failed:", err?.message || err),
            );
        } catch {
          // Non-serialisable body — skip caching, still send the response.
        }
      }
      return originalJson(body);
    }) as Response["json"];

    next();
  };
}
