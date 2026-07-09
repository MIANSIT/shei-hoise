-- Pathao Courier integration — support connecting multiple Pathao merchant
-- accounts per store, chosen per shipment. Safe to run multiple times.

ALTER TABLE "public"."store_pathao_credentials"
  DROP CONSTRAINT IF EXISTS "store_pathao_credentials_store_id_key";

ALTER TABLE "public"."store_pathao_credentials"
  ADD COLUMN IF NOT EXISTS "label" character varying(100) NOT NULL DEFAULT 'Pathao Account';

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "pathao_credential_id" "uuid";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pathao_credential_id_fkey"
    FOREIGN KEY ("pathao_credential_id") REFERENCES "public"."store_pathao_credentials"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
