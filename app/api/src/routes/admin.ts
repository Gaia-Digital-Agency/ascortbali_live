// This module defines administrative routes for managing application data.
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getPool } from "../lib/pg.js";
import { prisma } from "../prisma.js";
import { countryToRegion, ALL_REGIONS } from "../lib/regions.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isWhatsAppConfigured, sendOnboardingInvite } from "../lib/twilio.js";

// Create a new router for admin routes.
export const adminRouter = Router();

// Apply authentication and role-based access control middleware for all admin routes.
// This ensures that only authenticated admin users can access these endpoints.
adminRouter.use(requireAuth, requireRole(["admin"]));

// Route to fetch user and creator account data for admin overview (paginated).
adminRouter.get("/accounts", async (req, res) => {
  const pool = getPool();
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  try {
    const [usersRes, creatorsRes, userCountRes, creatorCountRes] = await Promise.all([
      pool.query(
        `SELECT id::text AS id, username, password, created_at, updated_at, COALESCE(verified, false) AS verified
           FROM app_accounts
          WHERE role = 'user'
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(
        `SELECT uuid::text AS id, username, password, temp_password, last_seen, created_at, updated_at,
                COALESCE(is_active, false) AS is_active, COALESCE(verified, false) AS verified,
                body_rating, face_rating
           FROM providers
          ORDER BY is_active DESC NULLS LAST, created_at DESC
          LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM app_accounts WHERE role = 'user'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM providers`),
    ]);
    res.json({
      users: usersRes.rows,
      creators: creatorsRes.rows,
      total_users: userCountRes.rows[0]?.count ?? 0,
      total_creators: creatorCountRes.rows[0]?.count ?? 0,
      page,
      limit,
    });
  } catch {
    res.status(500).json({ error: "accounts_load_failed" });
  }
});

// GET detail for a single user.
adminRouter.get("/accounts/users/:id", async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT a.id::text AS id, a.username, COALESCE(a.temp_password, '') AS password, COALESCE(a.temp_password, '') AS confirm_password, COALESCE(a.phone, '') AS phone, COALESCE(a.whatsapp, '') AS whatsapp, a.created_at, a.updated_at,
              COALESCE(up.full_name, '') AS full_name, COALESCE(up.gender, '') AS gender, COALESCE(up.age_group, '') AS age_group,
              COALESCE(up.nationality, '') AS nationality, COALESCE(up.city, '') AS city,
              COALESCE(up.relationship_status, '') AS relationship_status
         FROM app_accounts a
         LEFT JOIN user_profiles up ON up.account_id = a.id
        WHERE a.id = $1::uuid AND a.role = 'user'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "user_load_failed" });
  }
});

// GET detail for a single creator.
adminRouter.get("/accounts/creators/:id", async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT uuid::text AS id, provider_id, username, password, temp_password, model_name, gender, age, nationality, city,
              phone_number, cell_phone, telegram_id, wechat_id, last_seen, notes, location, eyes, hair_color, hair_length,
              travel, weight, height, ethnicity, languages, country, orientation, smoker, tattoo, piercing,
              bust_type, pubic_hair, escort_type,
              body_rating, face_rating,
              services, meeting_with, available_for, COALESCE(is_active, false) AS is_active,
              COALESCE(verified, false) AS verified, slug, url, title, created_at, updated_at
         FROM providers
        WHERE uuid = $1::uuid`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "creator_load_failed" });
  }
});

// Zod schema for updating a user account (admin can edit all fields).
const UpdateUserSchema = z.object({
  username: z.string().min(1).max(200).optional(),
  password: z.string().min(1).max(200).optional(),
  confirm_password: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  whatsapp: z.string().max(50).optional(),
  fullName: z.string().max(120).optional(),
  gender: z.string().max(20).optional(),
  ageGroup: z.string().max(20).optional(),
  nationality: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  relationshipStatus: z.string().max(20).optional(),
  verified: z.boolean().optional(),
});

// Route to update a user account (all fields).
adminRouter.put("/accounts/users/:id", async (req, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const p = parsed.data;
  // If the admin changes the password, confirm must match (when provided).
  if (p.password !== undefined && p.confirm_password !== undefined && p.password !== p.confirm_password) {
    return res.status(400).json({ error: "password_mismatch", message: "Password and confirm password do not match." });
  }

  const pool = getPool();
  try {
    // Update app_accounts fields.
    const accSet: string[] = ["updated_at = NOW()"];
    const accVals: unknown[] = [req.params.id];
    if (p.username !== undefined) { accVals.push(p.username); accSet.push(`username = $${accVals.length}`); }
    // Password edit: store bcrypt hash (login) + plaintext temp_password (admin view).
    if (p.password !== undefined) {
      const hashed = await bcrypt.hash(p.password, 10);
      accVals.push(hashed); accSet.push(`password = $${accVals.length}`);
      accVals.push(p.password); accSet.push(`temp_password = $${accVals.length}`);
    }
    if (p.phone !== undefined) { accVals.push(p.phone || null); accSet.push(`phone = $${accVals.length}`); }
    if (p.whatsapp !== undefined) { accVals.push(p.whatsapp || null); accSet.push(`whatsapp = $${accVals.length}`); }
    if (p.verified !== undefined) { accVals.push(p.verified); accSet.push(`verified = $${accVals.length}`); }
    await pool.query(`UPDATE app_accounts SET ${accSet.join(", ")} WHERE id = $1::uuid AND role = 'user'`, accVals);

    // Update user_profiles fields.
    const profSet: string[] = ["updated_at = NOW()"];
    const profVals: unknown[] = [req.params.id];
    if (p.fullName !== undefined) { profVals.push(p.fullName); profSet.push(`full_name = $${profVals.length}`); }
    if (p.gender !== undefined) { profVals.push(p.gender); profSet.push(`gender = $${profVals.length}`); }
    if (p.ageGroup !== undefined) { profVals.push(p.ageGroup); profSet.push(`age_group = $${profVals.length}`); }
    if (p.nationality !== undefined) { profVals.push(p.nationality); profSet.push(`nationality = $${profVals.length}`); }
    if (p.city !== undefined) { profVals.push(p.city); profSet.push(`city = $${profVals.length}`); }
    if (p.relationshipStatus !== undefined) { profVals.push(p.relationshipStatus); profSet.push(`relationship_status = $${profVals.length}`); }
    if (profSet.length > 1) {
      await pool.query(`UPDATE user_profiles SET ${profSet.join(", ")} WHERE account_id = $1::uuid`, profVals);
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "user_update_failed" });
  }
});

// Route to delete a user account.
adminRouter.delete("/accounts/users/:id", async (req, res) => {
  const pool = getPool();
  try {
    const rowCount = await pool.query(
      `DELETE FROM app_accounts WHERE id = $1::uuid AND role = 'user'`,
      [req.params.id]
    );
    if (rowCount.rowCount === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "user_delete_failed" });
  }
});

// Zod schema for updating a creator account (admin can edit all fields).
const UpdateCreatorSchema = z.object({
  username: z.string().email().optional(),
  password: z.string().min(6).max(200).optional(),
  tempPassword: z.string().max(200).optional().nullable(),
  model_name: z.string().max(100).optional(),
  gender: z.string().max(20).optional(),
  age: z.coerce.number().int().min(18).max(99).optional(),
  nationality: z.string().max(50).optional(),
  city: z.string().max(50).optional(),
  country: z.string().max(50).optional(),
  phone_number: z.string().max(50).optional(),
  cell_phone: z.string().max(50).optional(),
  telegram_id: z.string().max(100).optional(),
  ethnicity: z.string().max(50).optional(),
  languages: z.string().max(100).optional(),
  eyes: z.string().max(30).optional(),
  hair_color: z.string().max(30).optional(),
  hair_length: z.string().max(30).optional(),
  height: z.string().max(20).optional(),
  weight: z.string().max(20).optional(),
  travel: z.string().max(50).optional(),
  orientation: z.string().max(20).optional(),
  smoker: z.string().max(5).optional(),
  tattoo: z.string().max(5).optional(),
  piercing: z.string().max(5).optional(),
  services: z.string().max(500).optional(),
  meeting_with: z.string().max(20).optional(),
  available_for: z.string().max(20).optional(),
  bust_type: z.string().max(20).optional(),
  pubic_hair: z.string().max(20).optional(),
  wechat_id: z.string().max(100).optional(),
  escort_type: z.string().max(50).optional(),
  title: z.string().max(255).optional(),
  // Admin-set A-F ratings. Replace the deprecated vote tallies (body_votes /
  // face_votes JSONB) that the public site used to populate. null = clear.
  body_rating: z.enum(["A","B","C","D","E","F"]).nullable().optional(),
  face_rating: z.enum(["A","B","C","D","E","F"]).nullable().optional(),
  notes: z.string().max(5000).optional(),
  is_active: z.boolean().optional(),
  verified: z.boolean().optional(),
});

// Route to update a creator account (all fields).
adminRouter.put("/accounts/creators/:id", async (req, res) => {
  const parsed = UpdateCreatorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const p = parsed.data;

  const pool = getPool();
  try {
    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [req.params.id];
    const add = (col: string, val: unknown) => { values.push(val); setClauses.push(`${col} = $${values.length}`); };

    if (p.username !== undefined) add("username", p.username);
    if (p.password !== undefined) { const hashed = await bcrypt.hash(p.password, 10); add("password", hashed); }
    if (p.tempPassword !== undefined) add("temp_password", p.tempPassword ?? null);
    if (p.model_name !== undefined) add("model_name", p.model_name);
    if (p.gender !== undefined) add("gender", p.gender);
    if (p.age !== undefined) add("age", p.age);
    if (p.nationality !== undefined) add("nationality", p.nationality);
    if (p.city !== undefined) add("city", p.city);
    if (p.country !== undefined) add("country", p.country);
    if (p.phone_number !== undefined) add("phone_number", p.phone_number);
    if (p.cell_phone !== undefined) add("cell_phone", p.cell_phone);
    if (p.telegram_id !== undefined) add("telegram_id", p.telegram_id);
    if (p.ethnicity !== undefined) add("ethnicity", p.ethnicity);
    if (p.languages !== undefined) add("languages", p.languages);
    if (p.eyes !== undefined) add("eyes", p.eyes);
    if (p.hair_color !== undefined) add("hair_color", p.hair_color);
    if (p.hair_length !== undefined) add("hair_length", p.hair_length);
    if (p.height !== undefined) add("height", p.height);
    if (p.weight !== undefined) add("weight", p.weight);
    if (p.travel !== undefined) add("travel", p.travel);
    if (p.orientation !== undefined) add("orientation", p.orientation);
    if (p.smoker !== undefined) add("smoker", p.smoker);
    if (p.tattoo !== undefined) add("tattoo", p.tattoo);
    if (p.piercing !== undefined) add("piercing", p.piercing);
    if (p.services !== undefined) add("services", p.services);
    if (p.meeting_with !== undefined) add("meeting_with", p.meeting_with);
    if (p.available_for !== undefined) add("available_for", p.available_for);
    if (p.bust_type !== undefined)    add("bust_type", p.bust_type);
    if (p.pubic_hair !== undefined)   add("pubic_hair", p.pubic_hair);
    if (p.wechat_id !== undefined)    add("wechat_id", p.wechat_id);
    if (p.escort_type !== undefined)  add("escort_type", p.escort_type);
    if (p.title !== undefined)        add("title", p.title);
    if (p.body_rating !== undefined)  add("body_rating", p.body_rating);
    if (p.face_rating !== undefined)  add("face_rating", p.face_rating);
    if (p.notes !== undefined) add("notes", p.notes);
    if (p.is_active !== undefined) add("is_active", p.is_active);
    if (p.verified !== undefined) add("verified", p.verified);

    const rowCount = await pool.query(
      `UPDATE providers SET ${setClauses.join(", ")} WHERE uuid = $1::uuid`,
      values
    );
    if (rowCount.rowCount === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "creator_update_failed" });
  }
});

// Route to delete a creator account.
adminRouter.delete("/accounts/creators/:id", async (req, res) => {
  const pool = getPool();
  try {
    const rowCount = await pool.query(`DELETE FROM providers WHERE uuid = $1::uuid`, [req.params.id]);
    if (rowCount.rowCount === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "creator_delete_failed" });
  }
});

// ── Creator onboarding WhatsApp invite ────────────────────────────────
// Sends the creator their initial-login link + temp password (their mobile
// number). The creator then logs in at /creator/initial-login and verifies via
// the WhatsApp OTP (which flips `verified`). Per-creator and bulk endpoints.

type CreatorRow = {
  id: string;
  username: string;
  phone_number: string;
  cell_phone: string;
  temp_password: string;
};

// Resolve a creator's phone + temp password and send the invite. Returns a
// tagged result so callers can report sent / skipped / failed per creator.
async function sendOnboardingToCreator(
  c: CreatorRow
): Promise<{ ok: true } | { ok: false; skip: boolean; reason: string }> {
  const phone = String(c.phone_number || c.cell_phone || "").trim();
  const temp = String(c.temp_password || "").trim();
  if (!phone) return { ok: false, skip: true, reason: "no_phone" };
  if (!temp) return { ok: false, skip: true, reason: "no_temp_password" };
  // temp_password is plaintext for imported creators; bcrypt rows can't be sent
  // (we don't hold the plaintext), so skip them.
  if (/^\$2[aby]?\$/.test(temp)) return { ok: false, skip: true, reason: "temp_password_hashed" };
  try {
    await sendOnboardingInvite(phone, temp);
    return { ok: true };
  } catch (e) {
    return { ok: false, skip: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

const CREATOR_SELECT = `
  SELECT uuid::text AS id,
         COALESCE(username, '') AS username,
         COALESCE(phone_number, '') AS phone_number,
         COALESCE(cell_phone, '') AS cell_phone,
         COALESCE(temp_password, '') AS temp_password
    FROM providers`;

// POST /admin/creators/:id/send-onboarding — send one creator their invite.
adminRouter.post("/creators/:id/send-onboarding", async (req, res) => {
  if (!isWhatsAppConfigured()) return res.status(400).json({ error: "whatsapp_not_configured" });
  const pool = getPool();
  try {
    const { rows } = await pool.query(`${CREATOR_SELECT} WHERE uuid = $1::uuid`, [req.params.id]);
    const c = rows[0] as CreatorRow | undefined;
    if (!c) return res.status(404).json({ error: "not_found" });
    const result = await sendOnboardingToCreator(c);
    if (!result.ok) return res.status(422).json({ error: result.reason });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "send_failed" });
  }
});

// POST /admin/creators/send-onboarding-bulk — send to all unverified creators
// that have a phone number and a (plaintext) temp password.
adminRouter.post("/creators/send-onboarding-bulk", async (_req, res) => {
  if (!isWhatsAppConfigured()) return res.status(400).json({ error: "whatsapp_not_configured" });
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `${CREATOR_SELECT}
        WHERE COALESCE(verified, false) = false
          AND BTRIM(COALESCE(phone_number, '') || COALESCE(cell_phone, '')) <> ''`
    );
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const results: Array<{ id: string; username: string; status: string; reason?: string }> = [];
    // Sequential to avoid bursting Twilio rate limits on large lists.
    for (const c of rows as CreatorRow[]) {
      const r = await sendOnboardingToCreator(c);
      if (r.ok) {
        sent++;
        results.push({ id: c.id, username: c.username, status: "sent" });
      } else if (r.skip) {
        skipped++;
        results.push({ id: c.id, username: c.username, status: "skipped", reason: r.reason });
      } else {
        failed++;
        results.push({ id: c.id, username: c.username, status: "failed", reason: r.reason });
      }
    }
    return res.json({ total: rows.length, sent, failed, skipped, results });
  } catch {
    return res.status(500).json({ error: "bulk_send_failed" });
  }
});

// Route to fetch application statistics.
// This includes counts of creators and users.
adminRouter.get("/stats", async (_req, res) => {
  // Get a database connection from the pool.
  const pool = getPool();
  try {
    // Concurrently fetch the total number of providers (creators) and users.
    const [creatorCount, userCount] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM providers"),
      pool.query("SELECT COUNT(*)::int AS count FROM app_accounts WHERE role = 'user'"),
    ]);

    // Return the counts in a JSON response.
    res.json({
      creatorCount: creatorCount.rows[0]?.count ?? 0,
      userCount: userCount.rows[0]?.count ?? 0,
    });
  } catch {
    // If there's an error, return a 500 status with an error message.
    res.status(500).json({ error: "stats_load_failed" });
  }
});

// ── Advertising Spaces ───────────────────────────────────────────────────

const VALID_AD_SLOTS = [
  "home-1", "home-2", "home-3", "home-4",
  "home-5", "home-6", "home-7", "home-8",
  "home-9", "home-10", "home-11", "home-12",
  "home-13", "home-14", "home-15", "home-16",
  "home-17", "home-18", "home-19", "home-20",
  "bottom",
] as const;
type AdSlotName = typeof VALID_AD_SLOTS[number];

const UpsertAdSchema = z.object({
  slot: z.enum(VALID_AD_SLOTS),
  image: z.string().optional().nullable(),
  text: z.string().max(200).optional().nullable(),
  link_url: z.string().optional().nullable(),
});

const cleanAdText = (slot: AdSlotName, value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (slot === "bottom") return trimmed || "Your Ads Here";
  return trimmed ? trimmed.slice(0, 50) : null;
};

const normalizeLinkUrl = (slot: AdSlotName, value?: string | null) => {
  if (slot === "bottom") return null;
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const AD_SLOT_ORDER = new Map<string, number>(VALID_AD_SLOTS.map((s, i) => [s, i]));

adminRouter.get("/ads", async (_req, res) => {
  try {
    const spaces = await prisma.advertisingSpace.findMany({
      where: { slot: { in: [...VALID_AD_SLOTS] } },
      select: { slot: true, image: true, text: true, linkUrl: true },
    });
    spaces.sort((a, b) => (AD_SLOT_ORDER.get(a.slot) ?? 99) - (AD_SLOT_ORDER.get(b.slot) ?? 99));
    res.json(spaces.map(({ slot, image, text, linkUrl }) => ({ slot, image, text, link_url: linkUrl })));
  } catch {
    res.status(500).json({ error: "ads_load_failed" });
  }
});

adminRouter.post("/ads", async (req, res) => {
  const parsed = UpsertAdSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const item = parsed.data;
  const cleanText = cleanAdText(item.slot, item.text);
  const cleanImage = item.slot === "bottom" ? null : (item.image?.trim() || null);
  const cleanLinkUrl = normalizeLinkUrl(item.slot, item.link_url);
  if (item.slot !== "bottom" && item.link_url?.trim() && !cleanLinkUrl) {
    return res.status(400).json({ error: "invalid_link_url" });
  }

  try {
    const space = await prisma.advertisingSpace.upsert({
      where: { slot: item.slot },
      update: { image: cleanImage, text: cleanText, linkUrl: cleanLinkUrl },
      create: { slot: item.slot, title: "", subtitle: "", image: cleanImage ?? "", text: cleanText, linkUrl: cleanLinkUrl },
      select: { slot: true, image: true, text: true, linkUrl: true },
    });
    await prisma.advertisingSpaceHistory.create({
      data: { slot: item.slot, image: cleanImage, text: cleanText, linkUrl: cleanLinkUrl, action: "update" },
    });
    res.status(201).json({ slot: space.slot, image: space.image, text: space.text, link_url: space.linkUrl });
  } catch {
    res.status(500).json({ error: "ads_upsert_failed" });
  }
});

adminRouter.put("/ads/:slot", async (req, res) => {
  const mergedBody = { ...req.body, slot: req.params.slot };
  const parsed = UpsertAdSchema.safeParse(mergedBody);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const item = parsed.data;
  const cleanText = cleanAdText(item.slot, item.text);
  const cleanImage = item.slot === "bottom" ? null : (item.image?.trim() || null);
  const cleanLinkUrl = normalizeLinkUrl(item.slot, item.link_url);
  if (item.slot !== "bottom" && item.link_url?.trim() && !cleanLinkUrl) {
    return res.status(400).json({ error: "invalid_link_url" });
  }

  try {
    const existing = await prisma.advertisingSpace.findUnique({ where: { slot: item.slot } });
    if (!existing) return res.status(404).json({ error: "not_found" });
    const space = await prisma.advertisingSpace.update({
      where: { slot: item.slot },
      data: { image: cleanImage, text: cleanText, linkUrl: cleanLinkUrl },
      select: { slot: true, image: true, text: true, linkUrl: true },
    });
    await prisma.advertisingSpaceHistory.create({
      data: { slot: item.slot, image: cleanImage, text: cleanText, linkUrl: cleanLinkUrl, action: "update" },
    });
    res.json({ slot: space.slot, image: space.image, text: space.text, link_url: space.linkUrl });
  } catch {
    res.status(500).json({ error: "ads_update_failed" });
  }
});

adminRouter.delete("/ads/:slot", async (req, res) => {
  const slot = req.params.slot;
  if (!(VALID_AD_SLOTS as readonly string[]).includes(slot)) return res.status(400).json({ error: "invalid_slot" });

  try {
    const existing = await prisma.advertisingSpace.findUnique({ where: { slot } });
    if (!existing) return res.status(404).json({ error: "not_found" });
    const clearText = slot === "bottom" ? "Your Ads Here" : null;
    await prisma.advertisingSpace.update({
      where: { slot },
      data: { image: null, text: clearText, linkUrl: null },
    });
    await prisma.advertisingSpaceHistory.create({
      data: { slot, image: null, text: clearText, linkUrl: null, action: "delete" },
    });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "ads_delete_failed" });
  }
});

// ── Site Settings (tagline, featured girls) ───────────────────────────────

// GET all site settings.
adminRouter.get("/settings", async (_req, res) => {
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

// PUT a single site setting.
adminRouter.put("/settings/:key", async (req, res) => {
  const key = req.params.key;
  const value = String(req.body?.value ?? "");
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "settings_save_failed" });
  }
});

// GET list of active creator names for the featured girls selector.
adminRouter.get("/creator-names", async (_req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT uuid::text AS id, model_name FROM providers WHERE is_active IS TRUE AND model_name IS NOT NULL ORDER BY model_name`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "creator_names_load_failed" });
  }
});


// ── Dashboard metrics ─────────────────────────────────────────────────
// Returns aggregated visitor + page-view stats for the admin dashboard.
adminRouter.get("/metrics", async (_req, res) => {
  const pool = getPool();
  try {
    const [visitorWindows, pageViewWindows, regionRows, topCreators, deviceSplit, newVsReturning, bounce, votingAgg, hourlyHeat, serviceSplits] = await Promise.all([
      pool.query(`
        SELECT 'today'   AS window, COUNT(DISTINCT ip_hash) AS visitors FROM page_views WHERE viewed_at >= CURRENT_DATE
        UNION ALL SELECT '7d',  COUNT(DISTINCT ip_hash) FROM page_views WHERE viewed_at >= NOW() - INTERVAL '7 days'
        UNION ALL SELECT '30d', COUNT(DISTINCT ip_hash) FROM page_views WHERE viewed_at >= NOW() - INTERVAL '30 days'
        UNION ALL SELECT 'all', COUNT(DISTINCT ip_hash) FROM page_views
      `),
      pool.query(`
        SELECT 'today'   AS window, COUNT(*) AS views FROM page_views WHERE viewed_at >= CURRENT_DATE
        UNION ALL SELECT '7d',  COUNT(*) FROM page_views WHERE viewed_at >= NOW() - INTERVAL '7 days'
        UNION ALL SELECT '30d', COUNT(*) FROM page_views WHERE viewed_at >= NOW() - INTERVAL '30 days'
        UNION ALL SELECT 'all', COUNT(*) FROM page_views
      `),
      pool.query(`
        SELECT COALESCE(region, 'Other') AS region, COUNT(DISTINCT ip_hash) AS visitors
          FROM page_views GROUP BY region ORDER BY visitors DESC
      `),
      pool.query(`
        SELECT p.uuid::text AS uuid, p.model_name, p.slug, COUNT(*)::int AS views
          FROM page_views pv JOIN providers p ON p.uuid = pv.provider_uuid
         WHERE pv.viewed_at >= NOW() - INTERVAL '7 days'
         GROUP BY p.uuid, p.model_name, p.slug
         ORDER BY views DESC LIMIT 10
      `),
      pool.query(`
        SELECT COALESCE(device,'unknown') AS device, COUNT(DISTINCT ip_hash) AS n
          FROM page_views GROUP BY device ORDER BY n DESC
      `),
      pool.query(`
        WITH visits AS (SELECT ip_hash, COUNT(*) AS c FROM page_views GROUP BY ip_hash)
        SELECT CASE WHEN c = 1 THEN 'new' ELSE 'returning' END AS kind, COUNT(*) AS n
          FROM visits GROUP BY 1
      `),
      pool.query(`
        WITH visits AS (SELECT ip_hash, COUNT(*) AS c FROM page_views GROUP BY ip_hash)
        SELECT CASE WHEN c = 1 THEN 'one_page' ELSE 'multi_page' END AS kind, COUNT(*) AS n
          FROM visits GROUP BY 1
      `),
      pool.query(`
        SELECT
          (SELECT COALESCE(SUM((body_votes->>'firm')::int + (body_votes->>'curvy')::int + (body_votes->>'huggable')::int), 0) FROM providers) AS body_total,
          (SELECT COALESCE(SUM((face_votes->>'cute')::int + (face_votes->>'sexy')::int + (face_votes->>'pleasant')::int), 0) FROM providers) AS face_total,
          (SELECT COUNT(DISTINCT visitor_id) FROM creator_votes) AS voters
      `),
      pool.query(`
        SELECT EXTRACT(DOW FROM viewed_at)::int AS dow, EXTRACT(HOUR FROM viewed_at)::int AS hour, COUNT(*)::int AS n
          FROM page_views WHERE viewed_at >= NOW() - INTERVAL '30 days'
         GROUP BY dow, hour
      `),
      pool.query(`
        SELECT trim(s) AS service, COUNT(*)::int AS creators
          FROM providers,
               regexp_split_to_table(COALESCE(services, ''), ',') AS s
         WHERE is_active = TRUE AND COALESCE(services, '') <> ''
           AND trim(s) <> ''
         GROUP BY trim(s)
         ORDER BY creators DESC
      `),
    ]);
    res.json({
      visitors_by_window: Object.fromEntries(visitorWindows.rows.map(r => [r.window, Number(r.visitors)])),
      page_views_by_window: Object.fromEntries(pageViewWindows.rows.map(r => [r.window, Number(r.views)])),
      regions: regionRows.rows.map(r => ({ region: r.region, visitors: Number(r.visitors) })),
      top_creators_7d: topCreators.rows,
      devices: deviceSplit.rows,
      new_vs_returning: newVsReturning.rows,
      bounce: bounce.rows,
      voting: votingAgg.rows[0] ?? null,
      heatmap: hourlyHeat.rows,
      service_splits: serviceSplits.rows,
      all_regions: ALL_REGIONS,
    });
  } catch {
    res.status(500).json({ error: "metrics_failed" });
  }
});
