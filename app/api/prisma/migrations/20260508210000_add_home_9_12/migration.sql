-- Expand advertising_spaces.slot_check to include home-9..home-12.
-- These are 9:16 creator-style ads that appear at the top of the creator
-- grid on viewports where the side ads (home-1..home-4) don't fit.
ALTER TABLE advertising_spaces DROP CONSTRAINT IF EXISTS advertising_spaces_slot_check;
ALTER TABLE advertising_spaces ADD CONSTRAINT advertising_spaces_slot_check
  CHECK (slot::text = ANY (ARRAY[
    'home-1'::varchar, 'home-2'::varchar, 'home-3'::varchar, 'home-4'::varchar,
    'home-5'::varchar, 'home-6'::varchar, 'home-7'::varchar, 'home-8'::varchar,
    'home-9'::varchar, 'home-10'::varchar, 'home-11'::varchar, 'home-12'::varchar,
    'bottom'::varchar
  ]::text[]));

-- Seed empty rows for the new slots if absent.
INSERT INTO advertising_spaces (slot, title, subtitle, image, "createdAt", "updatedAt", created_at, updated_at)
SELECT s, '', '', '', NOW(), NOW(), NOW(), NOW()
  FROM unnest(ARRAY['home-9','home-10','home-11','home-12']) AS s
 WHERE NOT EXISTS (SELECT 1 FROM advertising_spaces WHERE slot = s);
