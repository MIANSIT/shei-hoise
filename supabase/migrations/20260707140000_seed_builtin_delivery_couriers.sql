-- Pathao and Steadfast must come from the same DB-driven list as any custom
-- courier, not be hardcoded in the frontend. Prepend them to every store's
-- delivery_couriers if not already present, preserving any custom couriers
-- already saved there.
UPDATE "public"."store_settings"
SET "delivery_couriers" =
  (CASE
     WHEN COALESCE("delivery_couriers", '[]'::jsonb) @> '[{"id":"pathao"}]'::jsonb
     THEN '[]'::jsonb
     ELSE '[{"id":"pathao","name":"Pathao","type":"pathao","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"}]'::jsonb
   END)
  ||
  (CASE
     WHEN COALESCE("delivery_couriers", '[]'::jsonb) @> '[{"id":"steadfast"}]'::jsonb
     THEN '[]'::jsonb
     ELSE '[{"id":"steadfast","name":"Steadfast","type":"steadfast","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"}]'::jsonb
   END)
  || COALESCE("delivery_couriers", '[]'::jsonb);

-- New stores (and any store_settings row inserted without specifying this
-- column) get the same two built-ins by default from now on.
ALTER TABLE "public"."store_settings"
  ALTER COLUMN "delivery_couriers" SET DEFAULT
  '[{"id":"pathao","name":"Pathao","type":"pathao","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"},
    {"id":"steadfast","name":"Steadfast","type":"steadfast","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"}]'::jsonb;
