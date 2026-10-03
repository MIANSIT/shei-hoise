-- Paperfly joins Pathao/Steadfast as a real courier integration. Its
-- credentials reuse the generic columns on store_courier_credentials:
--   client_id     -> Merchant Panel username (encrypted)
--   client_secret -> Merchant Panel password (encrypted)
--   api_key       -> paperflykey header value (encrypted)
--   pathao_store_name -> the storeName sent with every Paperfly order
ALTER TABLE "public"."store_courier_credentials"
  DROP CONSTRAINT IF EXISTS "store_courier_credentials_courier_check";

ALTER TABLE "public"."store_courier_credentials"
  ADD CONSTRAINT "store_courier_credentials_courier_check"
  CHECK (("courier")::"text" = ANY (ARRAY['pathao'::"text", 'steadfast'::"text", 'paperfly'::"text"]));

-- Add the built-in Paperfly entry to every store's courier list (same shape
-- as 20260707140000_seed_builtin_delivery_couriers.sql), inserted right
-- after Steadfast's position by simply appending — order only affects the
-- sidebar listing.
UPDATE "public"."store_settings"
SET "delivery_couriers" =
  COALESCE("delivery_couriers", '[]'::jsonb)
  || '[{"id":"paperfly","name":"Paperfly","type":"paperfly","deletable":false,"created_at":"2026-10-08T00:00:00.000Z"}]'::jsonb
WHERE NOT (COALESCE("delivery_couriers", '[]'::jsonb) @> '[{"id":"paperfly"}]'::jsonb);

ALTER TABLE "public"."store_settings"
  ALTER COLUMN "delivery_couriers" SET DEFAULT
  '[{"id":"pathao","name":"Pathao","type":"pathao","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"},
    {"id":"steadfast","name":"Steadfast","type":"steadfast","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"},
    {"id":"paperfly","name":"Paperfly","type":"paperfly","deletable":false,"created_at":"2026-10-08T00:00:00.000Z"},
    {"id":"shop","name":"Shop / From Shop","type":"shop","deletable":false,"created_at":"2026-09-01T00:00:00.000Z"}]'::jsonb;
