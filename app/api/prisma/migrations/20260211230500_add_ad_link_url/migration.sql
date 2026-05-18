ALTER TABLE "advertising_spaces"
ADD COLUMN IF NOT EXISTS "link_url" TEXT;

ALTER TABLE "advertising_space_history"
ADD COLUMN IF NOT EXISTS "link_url" TEXT;
