// Body/Face voting endpoints. Anonymous, cookie-based visitor identity.
// Each visitor can register ONE body choice + ONE face choice per creator.
// Changing a vote moves the count atomically (decrement old, increment new).
// Note: PrismaSqlPool wrapper doesn't expose connect(); we keep updates
// non-transactional. The cookie-bounded race window is acceptable for votes.
import { Router } from "express";
import { z } from "zod";
import { getPool } from "../lib/pg.js";

export const votesRouter = Router();

const BODY = new Set(["firm", "curvy", "huggable"]);
const FACE = new Set(["cute", "sexy", "pleasant"]);

const VoteSchema = z.object({
  visitorId: z.string().min(8).max(64),
  body: z.string().optional(),
  face: z.string().optional(),
});

async function findCreator(slugOrId: string) {
  const pool = getPool();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slugOrId);
  const { rows } = await pool.query(
    isUuid
      ? "SELECT uuid::text AS uuid, body_votes, face_votes FROM providers WHERE uuid = $1::uuid LIMIT 1"
      : "SELECT uuid::text AS uuid, body_votes, face_votes FROM providers WHERE LOWER(slug) = LOWER($1) LIMIT 1",
    [slugOrId]
  );
  return rows[0] ?? null;
}

// GET current totals + this visitor's choice (if any).
votesRouter.get("/:slug", async (req, res) => {
  try {
    const creator = await findCreator(req.params.slug);
    if (!creator) return res.status(404).json({ error: "not_found" });
    const visitorId = String((req.query.visitorId as string | undefined) ?? "").trim();
    let my: { body: string | null; face: string | null } = { body: null, face: null };
    if (visitorId) {
      const pool = getPool();
      const { rows } = await pool.query(
        "SELECT body_choice, face_choice FROM creator_votes WHERE visitor_id = $1 AND provider_uuid = $2::uuid LIMIT 1",
        [visitorId, creator.uuid]
      );
      if (rows[0]) my = { body: rows[0].body_choice, face: rows[0].face_choice };
    }
    res.json({
      body_votes: creator.body_votes,
      face_votes: creator.face_votes,
      my,
    });
  } catch {
    res.status(500).json({ error: "votes_load_failed" });
  }
});

// POST a vote (body / face / both). Reads previous → adjusts counts → upserts visitor row.
votesRouter.post("/:slug", async (req, res) => {
  const parsed = VoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const { visitorId } = parsed.data;
  const newBody = parsed.data.body && BODY.has(parsed.data.body) ? parsed.data.body : null;
  const newFace = parsed.data.face && FACE.has(parsed.data.face) ? parsed.data.face : null;
  if (!newBody && !newFace) return res.status(400).json({ error: "no_choice" });

  const pool = getPool();
  try {
    const creator = await findCreator(req.params.slug);
    if (!creator) return res.status(404).json({ error: "not_found" });

    const prevRes = await pool.query(
      "SELECT body_choice, face_choice FROM creator_votes WHERE visitor_id = $1 AND provider_uuid = $2::uuid LIMIT 1",
      [visitorId, creator.uuid]
    );
    const prev = prevRes.rows[0] ?? { body_choice: null, face_choice: null };

    const adjust = async (jsonbCol: "body_votes" | "face_votes", prevChoice: string | null, nextChoice: string | null) => {
      if (prevChoice === nextChoice) return;
      if (prevChoice) {
        await pool.query(
          `UPDATE providers SET ${jsonbCol} = jsonb_set(${jsonbCol}, ARRAY[$2], to_jsonb(GREATEST((${jsonbCol}->>$2)::int - 1, 0))) WHERE uuid = $1::uuid`,
          [creator.uuid, prevChoice]
        );
      }
      if (nextChoice) {
        await pool.query(
          `UPDATE providers SET ${jsonbCol} = jsonb_set(${jsonbCol}, ARRAY[$2], to_jsonb((${jsonbCol}->>$2)::int + 1)) WHERE uuid = $1::uuid`,
          [creator.uuid, nextChoice]
        );
      }
    };

    if (newBody !== null) await adjust("body_votes", prev.body_choice, newBody);
    if (newFace !== null) await adjust("face_votes", prev.face_choice, newFace);

    await pool.query(
      `INSERT INTO creator_votes (visitor_id, provider_uuid, body_choice, face_choice, voted_at)
       VALUES ($1, $2::uuid, $3, $4, NOW())
       ON CONFLICT (visitor_id, provider_uuid) DO UPDATE
         SET body_choice = COALESCE(EXCLUDED.body_choice, creator_votes.body_choice),
             face_choice = COALESCE(EXCLUDED.face_choice, creator_votes.face_choice),
             voted_at = NOW()`,
      [visitorId, creator.uuid, newBody ?? prev.body_choice, newFace ?? prev.face_choice]
    );

    const { rows } = await pool.query(
      "SELECT body_votes, face_votes FROM providers WHERE uuid = $1::uuid",
      [creator.uuid]
    );
    res.json({
      body_votes: rows[0].body_votes,
      face_votes: rows[0].face_votes,
      my: {
        body: newBody ?? prev.body_choice,
        face: newFace ?? prev.face_choice,
      },
    });
  } catch {
    res.status(500).json({ error: "vote_save_failed" });
  }
});
