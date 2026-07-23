-- Product bundles: a bundle is an ordinary products row (product_type =
-- 'bundle') with no product_inventory row of its own and no variants — its
-- stock is always derived from bundle_items at read time, and at order time
-- a bundle line explodes into real order_items rows for its components (see
-- order_items.parent_order_item_id below), so every existing stock
-- reservation/release/finalize code path keeps working unchanged.

ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "product_type" character varying(20) DEFAULT 'simple'::character varying NOT NULL;

DO $$ BEGIN
  ALTER TABLE "public"."products"
    ADD CONSTRAINT "products_product_type_check"
    CHECK ((("product_type")::"text" = ANY (ARRAY[('simple'::character varying)::"text", ('bundle'::character varying)::"text"])));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- bundle_items: the recipe. component_variant_id is nullable (component may
-- be a variant-less product). Nesting bundles inside bundles is rejected at
-- the application layer (createBundle/updateBundle), not here.
CREATE TABLE IF NOT EXISTS "public"."bundle_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bundle_product_id" "uuid" NOT NULL,
    "component_product_id" "uuid" NOT NULL,
    "component_variant_id" "uuid",
    "quantity_needed" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "bundle_items_quantity_needed_check" CHECK ("quantity_needed" > 0)
);
ALTER TABLE "public"."bundle_items" OWNER TO "postgres";
ALTER TABLE "public"."bundle_items" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_bundle_product_id_fkey" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_component_variant_id_fkey" FOREIGN KEY ("component_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_unique_component" UNIQUE ("bundle_product_id", "component_product_id", "component_variant_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "bundle_items_bundle_product_id_idx" ON "public"."bundle_items" ("bundle_product_id");
CREATE INDEX IF NOT EXISTS "bundle_items_component_product_id_idx" ON "public"."bundle_items" ("component_product_id");

GRANT ALL ON TABLE "public"."bundle_items" TO "service_role";
-- No anon/authenticated policies — accessed only via supabaseAdmin, same as stock_movements.

-- order_items: links a bundle's component line back to its header line, and
-- doubles as the permanent recipe snapshot (the row itself, with its own
-- quantity, is the historical fact — no separate snapshot table needed).
ALTER TABLE "public"."order_items"
  ADD COLUMN IF NOT EXISTS "parent_order_item_id" "uuid";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_parent_order_item_id_fkey" FOREIGN KEY ("parent_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "order_items_parent_order_item_id_idx" ON "public"."order_items" ("parent_order_item_id");
