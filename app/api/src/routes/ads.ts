// Routes for fetching advertising space data and public site settings.
import { Router } from "express";
import { cacheGet } from "../lib/cache.js";
import { getPool } from "../lib/pg.js";
import { prisma } from "../prisma.js";

export const adsRouter = Router();

const AD_SLOTS = [
  "home-1","home-2","home-3","home-4",
  "home-5","home-6","home-7","home-8",
  "home-9","home-10","home-11","home-12",
  "home-13","home-14","home-15","home-16",
  "home-17","home-18","home-19","home-20",
  "bottom",
] as const;

// Public route to get site settings (tagline, featured girls).
// site_settings is raw-SQL-only (not in Prisma schema).
adsRouter.get("/settings", cacheGet(60), async (_req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT key, value FROM site_settings ORDER BY key`);
    const obj: Record<string, string> = {};
    for (const r of rows) obj[String(r.key)] = String(r.value);
    res.json(obj);
  } catch {
    res.status(500).json({ error: "settings_load_failed" });
  }
});

// Route to fetch all active advertising spaces.
adsRouter.get("/", cacheGet(60), async (_req, res) => {
  try {
    const spaces = await prisma.advertisingSpace.findMany({
      where: { slot: { in: [...AD_SLOTS] } },
      select: { slot: true, image: true, text: true, linkUrl: true },
    });
    const slotOrder = new Map<string, number>(AD_SLOTS.map((s, i) => [s, i]));
    spaces.sort((a, b) => (slotOrder.get(a.slot) ?? 99) - (slotOrder.get(b.slot) ?? 99));
    // Remap linkUrl → link_url to match the legacy API shape the client expects.
    res.json(spaces.map(({ slot, image, text, linkUrl }) => ({ slot, image, text, link_url: linkUrl })));
  } catch {
    res.status(500).json({ error: "ads_load_failed" });
  }
});
