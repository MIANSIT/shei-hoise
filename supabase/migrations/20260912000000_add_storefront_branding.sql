-- Storefront redesign phase 1: a dedicated per-store branding table (brand
-- palette + announcement bar text), a multi-slide hero banner CMS, and
-- storefront-facing coupon display fields. All additive/nullable so existing
-- rows and running code keep working unchanged until a store owner opts in
-- via the new dashboard UI.
--
-- Branding gets its own table rather than more columns on store_settings —
-- that table already backs a settings page with many cards; piling unrelated
-- storefront-design fields onto it would make both the row and that page
-- harder to work with. One row per store, like store_settings.

CREATE TABLE IF NOT EXISTS "public"."store_branding" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    -- Shape: { primary, background, header, footer, card } — all hex
    -- strings. NULL means "no custom palette"; the app derives both light
    -- and dark CSS variable sets from this one value (see
    -- src/lib/utils/storeTheme.ts) and otherwise keeps its default theme.
    "theme_palette" jsonb,
    "announcement_text" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."store_branding" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_branding"
    ADD CONSTRAINT "store_branding_pkey" PRIMARY KEY ("id");
-- invalid_table_definition (42P16, "multiple primary keys... not allowed") is
-- what a re-run actually hits here, not duplicate_object — adding a second
-- PRIMARY KEY constraint fails that check before it ever gets to comparing
-- constraint names.
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_branding"
    ADD CONSTRAINT "store_branding_store_id_key" UNIQUE ("store_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_branding"
    ADD CONSTRAINT "store_branding_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

GRANT ALL ON TABLE "public"."store_branding" TO "service_role";

ALTER TABLE "public"."store_branding" ENABLE ROW LEVEL SECURITY;

-- Mirrors subscription_plans' plans_public_read / plans_service_write split:
-- this data is non-sensitive (colors + a text string) and is read anonymously
-- from every storefront page load, but only the service-role server actions
-- (never a direct client write) may change it.
DO $$ BEGIN
  CREATE POLICY "store_branding_public_read" ON "public"."store_branding" FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "store_branding_service_write" ON "public"."store_branding" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."store_branding" IS
  'One row per store: the storefront-design settings (brand palette + announcement bar text) surfaced by the dashboard''s Storefront Design page. Deliberately separate from store_settings.';

ALTER TABLE "public"."coupons"
  ADD COLUMN IF NOT EXISTS "title" text;

ALTER TABLE "public"."coupons"
  ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;

ALTER TABLE "public"."coupons"
  ADD COLUMN IF NOT EXISTS "show_on_storefront" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."store_hero_slides" (
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

ALTER TABLE "public"."store_hero_slides" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_hero_slides"
    ADD CONSTRAINT "store_hero_slides_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_hero_slides"
    ADD CONSTRAINT "store_hero_slides_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "store_hero_slides_store_sort_idx"
  ON "public"."store_hero_slides" ("store_id", "sort_order");

GRANT ALL ON TABLE "public"."store_hero_slides" TO "service_role";

ALTER TABLE "public"."store_hero_slides" ENABLE ROW LEVEL SECURITY;

-- Anonymous storefront visitors only ever need active slides (getActiveHeroSlides
-- filters this again in the query itself, but scoping the policy too means an
-- inactive/draft slide is never reachable via the anon key at all). The admin's
-- own list of all slides (including inactive) goes through supabaseAdmin, which
-- bypasses RLS entirely, so this doesn't affect the dashboard UI.
DO $$ BEGIN
  CREATE POLICY "store_hero_slides_public_read" ON "public"."store_hero_slides" FOR SELECT USING (("is_active" = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "store_hero_slides_service_write" ON "public"."store_hero_slides" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."store_hero_slides" IS
  'Admin-managed hero carousel slides for a store''s storefront homepage. A slide with no image_url is never inserted (image is required) — the storefront additionally skips any slide whose image fails to load, and falls back to the store''s single banner_url hero when zero active slides exist.';
