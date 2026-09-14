-- Admin-managed promo banners for the storefront homepage — a fixed 2-up
-- split section (e.g. "New Arrivals" / "Best Sellers") distinct from the
-- Hero Slides carousel. Same shape as store_hero_slides on purpose (image +
-- headline/subtext/button pair, sort_order, is_active) since it's the same
-- kind of admin-managed marketing banner, just displayed differently.

CREATE TABLE IF NOT EXISTS "public"."store_promo_banners" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    "image_url" text NOT NULL,
    "headline" text,
    "subtext" text,
    "button_text" text,
    "button_link" text,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."store_promo_banners" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_promo_banners"
    ADD CONSTRAINT "store_promo_banners_pkey" PRIMARY KEY ("id");
-- invalid_table_definition (42P16, "multiple primary keys... not allowed") is
-- what a re-run actually hits here, not duplicate_object — adding a second
-- PRIMARY KEY constraint fails that check before it ever gets to comparing
-- constraint names.
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_promo_banners"
    ADD CONSTRAINT "store_promo_banners_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "store_promo_banners_store_sort_idx"
  ON "public"."store_promo_banners" ("store_id", "sort_order");

GRANT ALL ON TABLE "public"."store_promo_banners" TO "service_role";

ALTER TABLE "public"."store_promo_banners" ENABLE ROW LEVEL SECURITY;

-- Same split as store_hero_slides: anonymous storefront visitors only ever
-- need active banners (getActivePromoBanners filters this again itself, but
-- scoping the policy too means an inactive/draft banner is never reachable
-- via the anon key at all). The admin's own list of all banners (including
-- inactive) goes through supabaseAdmin, which bypasses RLS entirely.
DO $$ BEGIN
  CREATE POLICY "store_promo_banners_public_read" ON "public"."store_promo_banners" FOR SELECT USING (("is_active" = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "store_promo_banners_service_write" ON "public"."store_promo_banners" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."store_promo_banners" IS
  'Admin-managed promo banners for a store''s storefront homepage (e.g. "New Arrivals" / "Best Sellers" split section) — distinct from store_hero_slides, which is the top-of-page carousel. A banner with no image_url is never inserted (image is required).';
