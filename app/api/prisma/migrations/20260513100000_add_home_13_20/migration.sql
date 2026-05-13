-- Expand advertising_spaces.slot_check to include home-13..home-20.
-- These are new ad slots used on the Creator Preview page:
--   home-13..16: 9:16 portrait side rails (left top/bottom, right top/bottom)
--   home-17..20: portrait cards in the Creator-Card area below the profile
ALTER TABLE advertising_spaces DROP CONSTRAINT IF EXISTS advertising_spaces_slot_check;
ALTER TABLE advertising_spaces ADD CONSTRAINT advertising_spaces_slot_check
  CHECK (slot::text = ANY (ARRAY[
    'home-1'::varchar,  'home-2'::varchar,  'home-3'::varchar,  'home-4'::varchar,
    'home-5'::varchar,  'home-6'::varchar,  'home-7'::varchar,  'home-8'::varchar,
    'home-9'::varchar,  'home-10'::varchar, 'home-11'::varchar, 'home-12'::varchar,
    'home-13'::varchar, 'home-14'::varchar, 'home-15'::varchar, 'home-16'::varchar,
    'home-17'::varchar, 'home-18'::varchar, 'home-19'::varchar, 'home-20'::varchar,
    'bottom'::varchar
  ]::text[]));

INSERT INTO advertising_spaces (slot, title, subtitle, image, "createdAt", "updatedAt", created_at, updated_at)
SELECT s, '', '', '', NOW(), NOW(), NOW(), NOW()
  FROM unnest(ARRAY[
    'home-13','home-14','home-15','home-16',
    'home-17','home-18','home-19','home-20'
  ]) AS s
 WHERE NOT EXISTS (SELECT 1 FROM advertising_spaces WHERE slot = s);
