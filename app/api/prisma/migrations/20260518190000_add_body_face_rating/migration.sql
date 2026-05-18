-- Admin-set Body and Face ratings (A-F) replacing the visitor voting feature.
-- Voting tally columns (body_votes, face_votes JSONB) and the creator_votes
-- table are intentionally left in place for now; the SPA + API no longer
-- read or write them, but keeping the schema avoids a destructive drop until
-- we are confident the rollout is stable.
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS body_rating CHAR(1) NULL,
  ADD COLUMN IF NOT EXISTS face_rating CHAR(1) NULL;

-- A-F whitelist with NULL permitted (= "not yet rated"). Lowercase rows
-- imported via scripts are tolerated by uppercasing on write; the constraint
-- only sees the canonical upper-case form.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_body_rating_check') THEN
    ALTER TABLE providers
      ADD CONSTRAINT providers_body_rating_check
      CHECK (body_rating IS NULL OR body_rating IN ('A','B','C','D','E','F'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_face_rating_check') THEN
    ALTER TABLE providers
      ADD CONSTRAINT providers_face_rating_check
      CHECK (face_rating IS NULL OR face_rating IN ('A','B','C','D','E','F'));
  END IF;
END$$;
