// This module defines routes for fetching advertising space data and public site settings.
import { Router } from "express";
import { getPool } from "../lib/pg.js";

export const adsRouter = Router();

// Public route to get site settings (tagline, featured girls).
adsRouter.get("/settings", async (_req, res) => {
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
adsRouter.get("/", async (_req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `
      SELECT slot, image, text, link_url
        FROM advertising_spaces
       WHERE slot IN (
              'home-1','home-2','home-3','home-4',
              'home-5','home-6','home-7','home-8',
              'home-9','home-10','home-11','home-12',
              'home-13','home-14','home-15','home-16',
              'home-17','home-18','home-19','home-20',
              'bottom'
            )
       ORDER BY CASE slot
          WHEN 'home-1'  THEN 1
          WHEN 'home-2'  THEN 2
          WHEN 'home-3'  THEN 3
          WHEN 'home-4'  THEN 4
          WHEN 'home-5'  THEN 5
          WHEN 'home-6'  THEN 6
          WHEN 'home-7'  THEN 7
          WHEN 'home-8'  THEN 8
          WHEN 'home-9'  THEN 9
          WHEN 'home-10' THEN 10
          WHEN 'home-11' THEN 11
          WHEN 'home-12' THEN 12
          WHEN 'home-13' THEN 13
          WHEN 'home-14' THEN 14
          WHEN 'home-15' THEN 15
          WHEN 'home-16' THEN 16
          WHEN 'home-17' THEN 17
          WHEN 'home-18' THEN 18
          WHEN 'home-19' THEN 19
          WHEN 'home-20' THEN 20
          WHEN 'bottom'  THEN 21
          ELSE 22
       END
      `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "ads_load_failed" });
  }
});
