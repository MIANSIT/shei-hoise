-- Missing migrations, part 1 of 2 (additive: new columns, a table and one function; no existing data changes).
-- Paste this whole file into Supabase Studio -> SQL Editor and run it once. Then run apply-2-profit-rollup-fix.sql.
-- Contains, in this order: 20261027 product_in_stock, 20261029 hero slide mobile button, 20261024 facebook ads connection, 20261025 checkout leads.

-- ============================================================
-- 20261027000000_add_product_in_stock.sql
-- ============================================================
-- SECURITY DEFINER because bundle_items has RLS with no storefront policy (the app
-- reads it through the service role); the function only ever returns a boolean.
-- Storefront "In stock / Out of stock" filter.
-- PostgREST exposes this as a computed column on products, so the shop page can
-- filter with product_in_stock = true/false in the same query that pages the
-- list (a client-side filter would break paging and the product count).
--   * bundle:  every slot (a fixed component, or a group of alternatives) has
--              at least one sellable option — same rule as getBundleAvailabilityMap
--   * variants: at least one active variant has stock
--   * simple:  the product's own inventory row has stock
CREATE OR REPLACE FUNCTION "public"."product_in_stock"("p" "public"."products")
RETURNS boolean
LANGUAGE "sql" STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT CASE
    WHEN p.product_type = 'bundle' THEN
      EXISTS (SELECT 1 FROM public.bundle_items b WHERE b.bundle_product_id = p.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.bundle_items bi
        WHERE bi.bundle_product_id = p.id
        GROUP BY COALESCE(bi.option_group_id::text, bi.id::text)
        HAVING NOT bool_or(
          COALESCE((
            SELECT i.quantity_available
            FROM public.product_inventory i
            WHERE i.product_id = bi.component_product_id
              AND i.variant_id IS NOT DISTINCT FROM bi.component_variant_id
            LIMIT 1
          ), 0) >= GREATEST(bi.quantity_needed, 1)
        )
      )
    WHEN EXISTS (
      SELECT 1 FROM public.product_variants v
      WHERE v.product_id = p.id AND v.is_active
    ) THEN
      EXISTS (
        SELECT 1
        FROM public.product_variants v
        JOIN public.product_inventory i ON i.variant_id = v.id
        WHERE v.product_id = p.id AND v.is_active AND i.quantity_available > 0
      )
    ELSE
      EXISTS (
        SELECT 1 FROM public.product_inventory i
        WHERE i.product_id = p.id AND i.variant_id IS NULL AND i.quantity_available > 0
      )
  END
$$;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 20261029000000_hero_slide_button_position_mobile.sql
-- ============================================================
-- Hero slide button: optional separate position for phones.
-- NULL means phones use the same position as desktop ("button_position").
ALTER TABLE "public"."store_hero_slides"
  ADD COLUMN IF NOT EXISTS "button_position_mobile" text;

ALTER TABLE "public"."store_hero_slides"
  DROP CONSTRAINT IF EXISTS "store_hero_slides_button_position_mobile_check";
ALTER TABLE "public"."store_hero_slides"
  ADD CONSTRAINT "store_hero_slides_button_position_mobile_check" CHECK (
    "button_position_mobile" IS NULL OR "button_position_mobile" IN (
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-center', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    )
  );


-- ============================================================
-- 20261024000000_add_facebook_ads_connection.sql
-- ============================================================
-- Facebook ads connection (Meta Marketing API) for the Pixel Analytics page.
--
-- A store owner can paste their ad account id and a Marketing API access token
-- (read-only "ads_read") so the dashboard can show ad spend, reach, clicks and
-- ROAS next to the store's own tracked sales.
--
-- Both columns are nullable, so existing stores and running code are untouched.
-- The token is stored encrypted (same AES-GCM scheme as
-- facebook_capi_access_token) and is never sent back to the browser.

ALTER TABLE "public"."store_settings"
  ADD COLUMN IF NOT EXISTS "facebook_ad_account_id" character varying,
  ADD COLUMN IF NOT EXISTS "facebook_ads_access_token" "text";

COMMENT ON COLUMN "public"."store_settings"."facebook_ad_account_id" IS
  'Meta ad account id, digits only (without the act_ prefix). Used to read ad insights.';
COMMENT ON COLUMN "public"."store_settings"."facebook_ads_access_token" IS
  'Encrypted Meta Marketing API token (ads_read). Server-side only; never returned to the client.';


-- ============================================================
-- 20261025000000_add_checkout_leads.sql
-- ============================================================
-- Abandoned checkouts: shoppers who typed a phone number at checkout.
--
-- One row per (store, phone), updated as the shopper fills in more of the form
-- and as the cart changes. Once they place an order the row is stamped
-- converted_at and stops showing up. The dashboard lists the rest so the owner
-- can call or WhatsApp them.
--
-- Contains customer phone numbers and names, so access is service-role only:
-- nothing reads or writes it with the anon or authenticated key. Every read and
-- write goes through server code that checks the store (see
-- src/app/api/checkout-lead and src/lib/queries/checkoutLeads).

CREATE TABLE IF NOT EXISTS "public"."checkout_leads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    -- Local Bangladeshi format, 11 digits starting 01
    "phone" character varying(20) NOT NULL,
    "customer_name" character varying(255),
    "city" character varying(255),
    "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "num_items" integer DEFAULT 0 NOT NULL,
    "cart_value" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" character varying(10),
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."checkout_leads" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."checkout_leads"
    ADD CONSTRAINT "checkout_leads_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."checkout_leads"
    ADD CONSTRAINT "checkout_leads_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- One live row per shopper per store; the capture route upserts on this.
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_leads_store_phone_key"
  ON "public"."checkout_leads" ("store_id", "phone");

-- The dashboard list: open leads for a store, newest first.
CREATE INDEX IF NOT EXISTS "checkout_leads_store_open_idx"
  ON "public"."checkout_leads" ("store_id", "updated_at" DESC)
  WHERE "converted_at" IS NULL;

GRANT ALL ON TABLE "public"."checkout_leads" TO "service_role";

ALTER TABLE "public"."checkout_leads" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "checkout_leads_service_only" ON "public"."checkout_leads" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."checkout_leads" IS
  'Shoppers who entered a phone number at checkout, for the abandoned-checkouts list. Holds customer phone numbers: service-role access only.';

