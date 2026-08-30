-- Customer reviews & ratings.
--
-- product_reviews and store_reviews already existed as unmigrated scaffold
-- tables (created outside the tracked migration history) with two live
-- problems, confirmed against the running database: customer_id's FK
-- pointed at public.users (the dashboard/vendor account table) instead of
-- public.store_customers (the storefront customer table), and both tables
-- had RLS disabled with full INSERT/SELECT/UPDATE/DELETE granted to
-- anon/authenticated — i.e. anyone holding the public anon key could
-- forge, edit, or delete any review directly via the REST API. Fixed here
-- alongside wiring product_reviews up to the app: FK corrected, RLS turned
-- on with no policies (all access goes through supabaseAdmin server
-- actions, same pattern as bundle_items/stock_movements), and the
-- anon/authenticated grants revoked as defense in depth.

ALTER TABLE ONLY "public"."product_reviews"
  DROP CONSTRAINT "product_reviews_customer_id_fkey";

ALTER TABLE ONLY "public"."product_reviews"
  ADD CONSTRAINT "product_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."store_reviews"
  DROP CONSTRAINT "store_reviews_customer_id_fkey";

ALTER TABLE ONLY "public"."store_reviews"
  ADD CONSTRAINT "store_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."store_reviews" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."product_reviews" FROM "anon";
REVOKE ALL ON TABLE "public"."product_reviews" FROM "authenticated";
REVOKE ALL ON TABLE "public"."store_reviews" FROM "anon";
REVOKE ALL ON TABLE "public"."store_reviews" FROM "authenticated";

-- Storefront reads approved reviews for one product, newest first.
CREATE INDEX IF NOT EXISTS "product_reviews_product_id_is_approved_idx"
  ON "public"."product_reviews" ("product_id", "is_approved", "created_at" DESC);

-- Eligibility checks look up a customer's own reviews for a product.
CREATE INDEX IF NOT EXISTS "product_reviews_customer_id_idx"
  ON "public"."product_reviews" ("customer_id");
