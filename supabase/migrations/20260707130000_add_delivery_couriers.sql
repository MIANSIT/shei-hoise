ALTER TABLE "public"."store_settings"
  ADD COLUMN IF NOT EXISTS "delivery_couriers" "jsonb" DEFAULT '[]'::jsonb;
