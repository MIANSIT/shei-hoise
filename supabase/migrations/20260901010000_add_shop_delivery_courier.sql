-- Adds a built-in "Shop / From Shop" courier (in-store/walk-in pickup, no
-- real delivery integration) to every store, the same way Pathao/Steadfast
-- were seeded in 20260707140000_seed_builtin_delivery_couriers.sql. Quick
-- Sale orders are created already DELIVERED, at which point the Delivery
-- Courier field locks — without a courier value set at creation time it was
-- showing permanently blank, so this gives it a real value to point at.
UPDATE "public"."store_settings"
SET "delivery_couriers" =
  (CASE
     WHEN COALESCE("delivery_couriers", '[]'::jsonb) @> '[{"id":"shop"}]'::jsonb
     THEN '[]'::jsonb
     ELSE '[{"id":"shop","name":"Shop / From Shop","type":"shop","deletable":false,"created_at":"2026-09-01T00:00:00.000Z"}]'::jsonb
   END)
  || COALESCE("delivery_couriers", '[]'::jsonb);

-- New stores (and any store_settings row inserted without specifying this
-- column) get all three built-ins by default from now on.
ALTER TABLE "public"."store_settings"
  ALTER COLUMN "delivery_couriers" SET DEFAULT
  '[{"id":"pathao","name":"Pathao","type":"pathao","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"},
    {"id":"steadfast","name":"Steadfast","type":"steadfast","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"},
    {"id":"shop","name":"Shop / From Shop","type":"shop","deletable":false,"created_at":"2026-09-01T00:00:00.000Z"}]'::jsonb;
