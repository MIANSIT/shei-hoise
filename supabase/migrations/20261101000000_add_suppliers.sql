-- Suppliers (importers) the store buys stock from. Each product can have a
-- default supplier; the Reorder List groups what to buy by supplier so each
-- importer gets only their own list. A supplier is not a vendor: vendors are
-- people the store sells to on credit, suppliers are who the store buys from.
--
-- Additive and nullable: products.supplier_id defaults to NULL, so existing
-- rows and running code are untouched. Apply this BEFORE deploying the code
-- that reads suppliers.
--
-- Writes go through supabaseAdmin in permission-checked server actions; the
-- SELECT policy lets anyone in the store read the list (the stock pages need
-- the names).
CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "phone" text,
    "email" text,
    "address" text,
    "notes" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."suppliers" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "suppliers_store_idx" ON "public"."suppliers" ("store_id");

GRANT ALL ON TABLE "public"."suppliers" TO "service_role";
GRANT SELECT ON TABLE "public"."suppliers" TO "authenticated";

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_store_select" ON "public"."suppliers";
CREATE POLICY "suppliers_store_select" ON "public"."suppliers" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT u."store_id" FROM "public"."users" u WHERE u."id" = auth.uid())
);

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "supplier_id" uuid;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "products_supplier_id_idx"
  ON "public"."products" ("supplier_id") WHERE "supplier_id" IS NOT NULL;
