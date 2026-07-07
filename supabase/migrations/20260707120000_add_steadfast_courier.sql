-- Widen the existing Pathao credentials table into a generic courier credentials table.
ALTER TABLE "public"."store_pathao_credentials" RENAME TO "store_courier_credentials";

ALTER TABLE "public"."store_courier_credentials"
  ADD COLUMN IF NOT EXISTS "courier" character varying(20) NOT NULL DEFAULT 'pathao',
  ADD COLUMN IF NOT EXISTS "api_key" "text",
  ADD COLUMN IF NOT EXISTS "secret_key" "text";

ALTER TABLE "public"."store_courier_credentials" ALTER COLUMN "client_id" DROP NOT NULL;
ALTER TABLE "public"."store_courier_credentials" ALTER COLUMN "client_secret" DROP NOT NULL;
ALTER TABLE "public"."store_courier_credentials" ALTER COLUMN "courier" DROP DEFAULT;

DO $$ BEGIN
  ALTER TABLE "public"."store_courier_credentials"
    ADD CONSTRAINT "store_courier_credentials_courier_check"
    CHECK (("courier")::"text" = ANY (ARRAY[('pathao'::character varying)::"text", ('steadfast'::character varying)::"text"]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Generalize the per-order shipment columns so any courier can populate them.
ALTER TABLE "public"."orders" RENAME COLUMN "pathao_credential_id" TO "courier_credential_id";
ALTER TABLE "public"."orders" RENAME COLUMN "pathao_consignment_id" TO "courier_consignment_id";
ALTER TABLE "public"."orders" RENAME COLUMN "pathao_order_status" TO "courier_order_status";
ALTER TABLE "public"."orders" RENAME COLUMN "pathao_shipment_details" TO "courier_shipment_details";
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "courier" character varying(20);
UPDATE "public"."orders" SET "courier" = 'pathao' WHERE "courier_consignment_id" IS NOT NULL AND "courier" IS NULL;
