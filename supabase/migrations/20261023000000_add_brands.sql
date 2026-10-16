-- Brands (plan feature "brands", optional limit "max_brands").
--
-- A store can keep a list of brands (name + logo) and tag each product with
-- one. The storefront then shows a "Shop by Brand" strip and filters the shop
-- by brand. Both are additive: products.brand_id is nullable, so existing
-- products and running code are untouched.
--
-- Whether a store may use brands is decided by its plan, not by this table —
-- every read and write goes through server code that checks the "brands"
-- feature flag (see src/lib/queries/brands). So RLS here is service-role only:
-- nothing reads or writes brands with the anon or authenticated key.
--
-- Logos are stored in the existing "category" storage bucket under
-- <store_id>/brands/<brand_id>/..., so no new bucket is needed.

CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "logo_url" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."brands" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- One brand name and one slug per store (case-insensitive on the name, so
-- "Cozie" and "cozie" can't both exist).
CREATE UNIQUE INDEX IF NOT EXISTS "brands_store_slug_key"
  ON "public"."brands" ("store_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "brands_store_name_key"
  ON "public"."brands" ("store_id", lower("name"));

GRANT ALL ON TABLE "public"."brands" TO "service_role";

ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "brands_service_write" ON "public"."brands" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."brands" IS
  'Per-store product brands (name + logo), a plan feature ("brands"). Service-role access only; the feature check lives in the server actions under src/lib/queries/brands.';

-- A product's brand. Deleting a brand leaves its products in place, brandless.
ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "brand_id" uuid;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "products_brand_id_idx"
  ON "public"."products" ("brand_id")
  WHERE "brand_id" IS NOT NULL;
