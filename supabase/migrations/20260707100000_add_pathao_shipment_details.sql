ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "pathao_shipment_details" "jsonb";
