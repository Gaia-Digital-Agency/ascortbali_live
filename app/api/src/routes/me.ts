// This module defines routes for authenticated users to manage their profiles and data.
import { Router } from "express";
import { z } from "zod";
import { getPool } from "../lib/pg.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { slugify, uniqueCreatorSlug } from "../lib/slug.js";
import { normalizeCategoryCsv } from "./auth.js";

export const meRouter = Router();

const normalizeEnum = (value: unknown) => String(value ?? "").trim().toLowerCase();
const normalizeGender = (value: unknown) => {
  const v = normalizeEnum(value);
  if (v === "female" || v === "f") return "female";
  if (v === "male" || v === "m") return "male";
  if (v === "trans" || v === "transgender") return "transgender";
  return v;
};
const normalizeYesNo = (value: unknown) => {
  const v = normalizeEnum(value);
  if (v === "yes" || v === "y" || v === "true" || v === "1") return "yes";
  if (v === "no" || v === "n" || v === "false" || v === "0") return "no";
  return v;
};
const normalizeOrientation = (value: unknown) => {
  const v = normalizeEnum(value);
  if (v === "straight") return "straight";
  if (v === "bisexual" || v === "bi") return "bisexual";
  if (v === "lesbian") return "lesbian";
  if (v === "gay") return "gay";
  if (!v) return v;
  return "other";
};
const normalizeMeetingWith = (value: unknown) => {
  const v = normalizeEnum(value);
  if (v === "men" || v === "man" || v === "male") return "men";
  if (v === "women" || v === "woman" || v === "female") return "women";
  if (v === "couples" || v === "couple") return "couples";
  if (v.includes("man+woman") || v.includes("man + woman")) return "couples";
  if (v === "all") return "all";
  return v;
};
const normalizeAvailableFor = (value: unknown) => {
  const v = normalizeEnum(value);
  if (v.includes("outcall") && v.includes("incall")) return "both";
  if (v === "both") return "both";
  if (v.includes("incall")) return "incall";
  if (v.includes("outcall")) return "outcall";
  return v;
};
const CREATOR_NAME_REGEX = /^[A-Za-z0-9]{1,50}$/;

// Route to get the currently authenticated user's basic information.
meRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  res.json({
    id: req.user!.id,
    role: req.user!.role,
    username: req.user!.username,
  });
});

// Zod schema for validating user profile data.
const UserProfileSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  fullName: z.string().min(2).max(120),
  gender: z.enum(["female", "male", "transgender"]),
  ageGroup: z.enum(["18-24", "25-34", "35-44", "45+"]),
  nationality: z.string().min(2).max(80),
  city: z.string().min(2).max(80),
  preferredContact: z.enum(["whatsapp", "telegram", "wechat"]),
  relationshipStatus: z.enum(["single", "married", "other"]),
  phoneNumber: z.string().max(50).optional().default(""),
  whatsapp: z.string().max(50).optional().default(""),
});

// Route to get the authenticated user's profile details.
meRouter.get("/user-profile", requireAuth, requireRole(["user"]), async (req: AuthedRequest, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `
      SELECT up.full_name,
             up.gender,
             up.age_group,
             up.nationality,
             up.city,
             up.preferred_contact,
             up.relationship_status,
             COALESCE(a.phone, '') AS phone,
             COALESCE(a.whatsapp, '') AS whatsapp,
             a.username AS email
        FROM user_profiles up
        JOIN app_accounts a ON a.id = up.account_id
       WHERE up.account_id = $1::uuid
      `,
      [req.user!.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "not_found" });

    return res.json({
      email: rows[0].email,
      fullName: rows[0].full_name,
      gender: rows[0].gender,
      ageGroup: rows[0].age_group,
      nationality: rows[0].nationality,
      city: rows[0].city,
      preferredContact: rows[0].preferred_contact,
      relationshipStatus: rows[0].relationship_status,
      phoneNumber: rows[0].phone,
      whatsapp: rows[0].whatsapp,
    });
  } catch (err) {
    console.error("GET /me/user-profile failed", { userId: req.user?.id, err });
    return res.status(500).json({ error: "profile_load_failed" });
  }
});

// Route to update or create the authenticated user's profile.
meRouter.put("/user-profile", requireAuth, requireRole(["user"]), async (req: AuthedRequest, res) => {
  const parsed = UserProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const pool = getPool();
  const p = parsed.data;
  try {
    // If email is changing, check uniqueness first.
    if (p.email) {
      const dup = await pool.query(
        `SELECT 1 FROM app_accounts WHERE LOWER(username) = $1 AND id <> $2::uuid LIMIT 1`,
        [p.email, req.user!.id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: "email_taken", message: "This email is already in use." });
      }
    }

    // Update email, phone, whatsapp on the account row.
    await pool.query(
      `UPDATE app_accounts SET username = COALESCE($2, username), phone = $3, whatsapp = $4, updated_at = NOW() WHERE id = $1::uuid`,
      [req.user!.id, p.email || null, p.phoneNumber || null, p.whatsapp || null]
    );

    const upsertRes = await pool.query(
      `
      INSERT INTO user_profiles (
        account_id, full_name, gender, age_group, nationality, city, preferred_contact, relationship_status
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (account_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        age_group = EXCLUDED.age_group,
        nationality = EXCLUDED.nationality,
        city = EXCLUDED.city,
        preferred_contact = EXCLUDED.preferred_contact,
        relationship_status = EXCLUDED.relationship_status,
        updated_at = NOW()
      RETURNING full_name, gender, age_group, nationality, city, preferred_contact, relationship_status
      `,
      [req.user!.id, p.fullName, p.gender, p.ageGroup, p.nationality, p.city, p.preferredContact, p.relationshipStatus]
    );
    // Defensive: if RETURNING is unexpectedly empty (seen in some managed PG/proxy setups),
    // follow up with a SELECT so the request still succeeds.
    let row = upsertRes.rows[0];
    if (!row) {
      const { rows } = await pool.query(
        `
        SELECT full_name,
               gender,
               age_group,
               nationality,
               city,
               preferred_contact,
               relationship_status
          FROM user_profiles
         WHERE account_id = $1::uuid
        `,
        [req.user!.id]
      );
      row = rows[0];
    }
    if (!row) return res.status(500).json({ error: "profile_save_failed" });
    return res.json({
      email: p.email || req.user!.username,
      fullName: row.full_name,
      gender: row.gender,
      ageGroup: row.age_group,
      nationality: row.nationality,
      city: row.city,
      preferredContact: row.preferred_contact,
      relationshipStatus: row.relationship_status,
      phoneNumber: p.phoneNumber,
      whatsapp: p.whatsapp,
    });
  } catch (err) {
    console.error("PUT /me/user-profile failed", { userId: req.user?.id, err });
    return res.status(500).json({ error: "profile_save_failed" });
  }
});

// Zod schema for validating creator profile data.
const CreatorProfileSchema = z.object({
  username: z.string().trim().toLowerCase().email(),
  title: z.string().min(1).max(255),
  url: z.string().max(2000),
  tempPassword: z.string().max(100),
  telegramId: z.string().max(100).optional().default(""),
  lastSeen: z.string().min(1).max(40),
  notes: z.string().min(1).max(4000),
  modelName: z.string().trim().regex(CREATOR_NAME_REGEX),
  isActive: z.boolean().optional(),
  gender: z.preprocess(normalizeGender, z.enum(["female", "male", "transgender"])),
  age: z.coerce.number().int().min(18).max(60),
  location: z.string().max(100),
  eyes: z.string().min(1).max(20),
  hairColor: z.string().min(1).max(30),
  hairLength: z.string().min(1).max(20),
  travel: z.string().min(1).max(50),
  weight: z.string().min(1).max(30),
  height: z.string().min(1).max(30),
  ethnicity: z.string().min(1).max(50),
  nationality: z.string().min(2).max(50),
  languages: z.string().min(1).max(400),
  phoneNumber: z.string().min(1).max(50),
  cellPhone: z.string().min(1).max(50),
  // WeChat ID is optional — creators may or may not have one. Stored in
  // providers.wechat_id (already exists in the schema).
  wechatId: z.string().max(100).optional().default(""),
  // Country is no longer collected on the creator profile form. Existing
  // rows keep whatever value they had; new saves typically send "".
  country: z.string().max(50).optional().default(""),
  // City now stores comma-separated Bali service areas (e.g. "Ubud, Canggu").
  // Bumped max from 50 to 500 to fit several zones.
  city: z.string().min(2).max(500),
  // Orientation: Straight / Bi Sexual / Lesbian (stored lower-case in
  // providers.orientation). Older values "bisexual", "gay", "other" are
  // accepted at write-time and normalized into the current set.
  orientation: z.string().trim().toLowerCase().min(1).max(30),
  smoker: z.preprocess(normalizeYesNo, z.enum(["yes", "no"])),
  tattoo: z.preprocess(normalizeYesNo, z.enum(["yes", "no"])),
  piercing: z.preprocess(normalizeYesNo, z.enum(["yes", "no"])),
  services: z.string().min(2),
  bustType: z.string().trim().min(1).max(20),
  pubicHair: z.string().trim().min(1).max(20),
  meetingWith: z.preprocess(normalizeMeetingWith, z.enum(["men", "women", "couples", "all"])),
  availableFor: z.preprocess(normalizeAvailableFor, z.enum(["incall", "outcall", "both"])),
  // Category: one or more of escort / sugar babies / massage / dating/brides.
  // Persisted as a comma-separated CSV in providers.escort_type. Normalized
  // by normalizeCategoryCsv (auth.ts) — accepts array or string and emits CSV.
  // Default "escort" is preserved from the pre-multi-select schema.
  form: z.preprocess(normalizeCategoryCsv, z.string().min(1).max(60).optional().default("escort")),
});

// Route to get the authenticated creator's profile details.
meRouter.get("/creator-profile", requireAuth, requireRole(["creator"]), async (req: AuthedRequest, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `
      SELECT uuid::text AS uuid,
             provider_id,
             username,
             title,
             url,
             temp_password,
             telegram_id,
             last_seen,
             notes,
             model_name,
             gender,
             age,
             location,
             eyes,
             hair_color,
             hair_length,
             travel,
             is_active,
             weight,
             height,
             ethnicity,
             nationality,
             languages,
             phone_number,
             cell_phone,
             wechat_id,
             country,
             city,
             orientation,
             smoker,
             tattoo,
             piercing,
             bust_type,
             pubic_hair,
             services,
             meeting_with,
             available_for,
             escort_type AS form
        FROM providers
       WHERE uuid = $1::uuid
      `,
      [req.user!.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    const r = rows[0];
    // Normalize enum-like fields to the API's canonical values so the frontend can
    // round-trip data without failing Zod validation on save.
    return res.json({
      ...r,
      gender: normalizeGender(r.gender),
      orientation: normalizeOrientation(r.orientation),
      smoker: normalizeYesNo(r.smoker),
      tattoo: normalizeYesNo(r.tattoo),
      piercing: normalizeYesNo(r.piercing),
      meeting_with: normalizeMeetingWith(r.meeting_with),
      available_for: normalizeAvailableFor(r.available_for),
    });
  } catch (err) {
    console.error("GET /me/creator-profile failed", { userId: req.user?.id, err });
    return res.status(500).json({ error: "creator_load_failed" });
  }
});

// Route to update the authenticated creator's profile.
meRouter.put("/creator-profile", requireAuth, requireRole(["creator"]), async (req: AuthedRequest, res) => {
  const parsed = CreatorProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const p = parsed.data;
  // Phone/WhatsApp empty-fill rule (item 87): if either is blank, copy from
  // the other. The schema requires min(1) on both, so this almost never
  // triggers — present as a defensive backstop.
  const phoneFinal = p.phoneNumber || p.cellPhone;
  const cellPhoneFinal = p.cellPhone || p.phoneNumber;
  if (!CREATOR_NAME_REGEX.test(p.modelName)) {
    return res
      .status(400)
      .json({ error: "invalid_creator_name", message: "Creator name must be one word, alphanumeric only, max 50 characters." });
  }

  const pool = getPool();
  try {
    const duplicateNameRes = await pool.query(
      `
      SELECT 1
        FROM providers
       WHERE LOWER(model_name) = LOWER($1)
         AND uuid <> $2::uuid
       LIMIT 1
      `,
      [p.modelName, req.user!.id]
    );
    if (duplicateNameRes.rows[0]) {
      return res.status(409).json({ error: "creator_name_taken", message: "Creator name is already in use." });
    }
    const duplicateUsernameRes = await pool.query(
      `
      SELECT 1
        FROM providers
       WHERE LOWER(username) = LOWER($1)
         AND uuid <> $2::uuid
       LIMIT 1
      `,
      [p.username, req.user!.id]
    );
    if (duplicateUsernameRes.rows[0]) {
      return res.status(409).json({ error: "username_taken", message: "Username is already in use." });
    }

    // Slug regeneration on rename. We compare the incoming modelName to the
    // currently-stored model_name; if different, we mint a new unique slug
    // and update the public URL too. Old /creator/preview/<old-slug> URLs
    // will 404 after rename — accepted trade-off per the user's spec.
    const currentRes = await pool.query(
      `SELECT slug, model_name FROM providers WHERE uuid = $1::uuid`,
      [req.user!.id]
    );
    const current = currentRes.rows[0] as { slug: string | null; model_name: string } | undefined;
    let nextSlug: string = String(current?.slug ?? "");
    let nextUrl: string = p.url;
    if (current && slugify(current.model_name ?? "") !== slugify(p.modelName)) {
      // Name changed — regenerate slug + url.
      nextSlug = await uniqueCreatorSlug(pool, p.modelName);
      nextUrl = `/creator/preview/${nextSlug}`;
    } else if (!nextSlug) {
      // Defensive: an old row with no slug yet — backfill on first save.
      nextSlug = await uniqueCreatorSlug(pool, p.modelName);
      nextUrl = `/creator/preview/${nextSlug}`;
    }

    const updateRes = await pool.query(
      `
        UPDATE providers
           SET username = $2,
               title = $3,
               url = $4,
               temp_password = $5,
               telegram_id = $6,
               last_seen = $7,
               notes = $8,
               model_name = $9,
               gender = $10,
               age = $11,
               location = $12,
               eyes = $13,
               hair_color = $14,
               hair_length = $15,
               travel = $16,
               weight = $17,
               height = $18,
               ethnicity = $19,
               nationality = $20,
               languages = $21,
               phone_number = $22,
               cell_phone = $23,
               country = $24,
               city = $25,
               orientation = $26,
               smoker = $27,
               tattoo = $28,
               piercing = $29,
               services = $30,
               meeting_with = $31,
               available_for = $32,
               is_active = COALESCE($33, is_active),
               wechat_id = $34,
               escort_type = $35,
               slug = $36,
               bust_type = $37,
               pubic_hair = $38,
               updated_at = NOW()
       WHERE uuid = $1::uuid
       RETURNING uuid::text AS uuid,
                 provider_id,
                 username,
                 title,
                 url,
                 temp_password,
                 telegram_id,
                 last_seen,
                 notes,
                 model_name,
                 gender,
                 age,
                 location,
                 eyes,
                 hair_color,
                 hair_length,
                 travel,
                 is_active,
                 weight,
                 height,
                 ethnicity,
                 nationality,
                 languages,
                 phone_number,
                 cell_phone,
                 wechat_id,
                 country,
                 city,
                 orientation,
                 smoker,
                 tattoo,
                 piercing,
                 bust_type,
                 pubic_hair,
                 services,
                 meeting_with,
                 available_for,
                 escort_type AS form
      `,
      [
        req.user!.id,
        p.username,
        p.title,
        nextUrl,
        p.tempPassword,
        p.telegramId,
        p.lastSeen,
        p.notes,
        p.modelName,
        p.gender,
        p.age,
        p.location,
        p.eyes,
        p.hairColor,
        p.hairLength,
        p.travel,
        p.weight,
        p.height,
        p.ethnicity,
        p.nationality,
        p.languages,
        phoneFinal,
        cellPhoneFinal,
        p.country,
        p.city,
        p.orientation,
        p.smoker,
        p.tattoo,
        p.piercing,
        p.services,
        p.meetingWith,
        p.availableFor,
        p.isActive,
        p.wechatId,
        p.form,
        nextSlug,
        p.bustType,
        p.pubicHair,
      ]
    );
    let row = updateRes.rows[0];
    if (!row) {
      const { rows } = await pool.query(
        `
        SELECT uuid::text AS uuid,
               provider_id,
               username,
               title,
               url,
               temp_password,
               last_seen,
               notes,
               model_name,
               gender,
               age,
               location,
               eyes,
               hair_color,
               hair_length,
               travel,
               is_active,
               weight,
               height,
               ethnicity,
               nationality,
               languages,
               phone_number,
               cell_phone,
               wechat_id,
               country,
               city,
               orientation,
               smoker,
               tattoo,
               piercing,
               services,
               meeting_with,
               available_for,
               escort_type AS form
          FROM providers
         WHERE uuid = $1::uuid
        `,
        [req.user!.id]
      );
      row = rows[0];
    }
    if (!row) return res.status(404).json({ error: "not_found" });
    return res.json({
      ...row,
      gender: normalizeGender(row.gender),
      orientation: normalizeOrientation(row.orientation),
      smoker: normalizeYesNo(row.smoker),
      tattoo: normalizeYesNo(row.tattoo),
      piercing: normalizeYesNo(row.piercing),
      meeting_with: normalizeMeetingWith(row.meeting_with),
      available_for: normalizeAvailableFor(row.available_for),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "creator_name_taken", message: "Creator name is already in use." });
    }
    console.error("PUT /me/creator-profile failed", { userId: req.user?.id, err });
    return res.status(500).json({ error: "creator_save_failed" });
  }
});

// Route to get the authenticated creator's images.
meRouter.get("/creator-images", requireAuth, requireRole(["creator"]), async (req: AuthedRequest, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `
      SELECT image_id, image_file, sequence_number
        FROM provider_images
       WHERE provider_uuid = $1::uuid
       ORDER BY sequence_number ASC
      `,
      [req.user!.id]
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "images_load_failed" });
  }
});

// Zod schema for validating creator image data.
const CreatorImageSchema = z.object({
  sequenceNumber: z.coerce.number().int().min(1).max(20),
  imageFile: z.string().min(1),
});

// Route to create a new image for the authenticated creator.
meRouter.post("/creator-images", requireAuth, requireRole(["creator"]), async (req: AuthedRequest, res) => {
  const parsed = CreatorImageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const pool = getPool();
  const imageId = `MANUAL_${req.user!.id.slice(0, 8)}_${parsed.data.sequenceNumber}`;
  try {
    const { rows } = await pool.query(
      `
      INSERT INTO provider_images (image_id, provider_uuid, provider_id, image_file, sequence_number, resolution)
      SELECT $2, p.uuid, p.provider_id, $3, $1, 'clean'
      FROM providers p
      WHERE p.uuid = $4::uuid
      ON CONFLICT (provider_uuid, sequence_number) DO UPDATE SET
        image_id = EXCLUDED.image_id,
        image_file = EXCLUDED.image_file
      RETURNING image_id, image_file, sequence_number
      `,
      [parsed.data.sequenceNumber, imageId, parsed.data.imageFile.trim(), req.user!.id]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ error: "image_save_failed" });
  }
});

// Route to update an existing image for the authenticated creator.
meRouter.put("/creator-images/:imageId", requireAuth, requireRole(["creator"]), async (req: AuthedRequest, res) => {
  const parsed = CreatorImageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `
      UPDATE provider_images
         SET sequence_number = $1,
             image_file = $2
       WHERE image_id = $3
         AND provider_uuid = $4::uuid
       RETURNING image_id, image_file, sequence_number
      `,
      [parsed.data.sequenceNumber, parsed.data.imageFile.trim(), req.params.imageId, req.user!.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: "image_update_failed" });
  }
});

// Route to delete an image for the authenticated creator.
meRouter.delete("/creator-images/:imageId", requireAuth, requireRole(["creator"]), async (req: AuthedRequest, res) => {
  const pool = getPool();
  try {
    const { rowCount } = await pool.query(
      `
      DELETE FROM provider_images
       WHERE image_id = $1
         AND provider_uuid = $2::uuid
      `,
      [req.params.imageId, req.user!.id]
    );
    if (!rowCount) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "image_delete_failed" });
  }
});
