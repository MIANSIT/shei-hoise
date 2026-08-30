-- Store reviews grow a four-category breakdown (product quality, delivery,
-- customer service, value for money) alongside the existing overall
-- `rating` — the same one-number-only shape as product_reviews wasn't
-- enough for a "rate the seller" experience, which is naturally
-- multi-dimensional (Daraz/AliExpress-style seller ratings). `rating`
-- itself is kept as the auto-computed average of the four (see
-- createStoreReview.ts), so every existing "average + total" query
-- (home page badge, product page teaser) keeps working unchanged.
--
-- rating and the four category columns all become nullable — mirrors
-- product_reviews' 20260829000001 change: a logged-in customer can leave a
-- comment-only store review with no verified order behind it, in which
-- case there's nothing to rate at all.

ALTER TABLE ONLY "public"."store_reviews" ALTER COLUMN "rating" DROP NOT NULL;

ALTER TABLE ONLY "public"."store_reviews"
  ADD COLUMN IF NOT EXISTS "product_quality_rating" integer,
  ADD COLUMN IF NOT EXISTS "delivery_rating" integer,
  ADD COLUMN IF NOT EXISTS "service_rating" integer,
  ADD COLUMN IF NOT EXISTS "value_rating" integer;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_product_quality_rating_check" CHECK ("product_quality_rating" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_delivery_rating_check" CHECK ("delivery_rating" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_service_rating_check" CHECK ("service_rating" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_value_rating_check" CHECK ("value_rating" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One store review per customer, ever — regardless of order_id (optional:
-- set only when a verified delivered order backs the review). Matches
-- product_reviews' 20260828000003 move away from per-order uniqueness.
-- Found by columns rather than a hardcoded name, since the scaffold table's
-- actual constraint name isn't guaranteed to match what a fresh CREATE
-- TABLE would produce.
DO $$
DECLARE
  old_constraint_name text;
BEGIN
  SELECT con.conname INTO old_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'store_reviews'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(attr.attname::text ORDER BY attr.attname)
      FROM unnest(con.conkey) AS colnum
      JOIN pg_attribute attr ON attr.attrelid = con.conrelid AND attr.attnum = colnum
    ) = ARRAY['customer_id', 'order_id', 'store_id']
  LIMIT 1;

  IF old_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ONLY "public"."store_reviews" DROP CONSTRAINT %I', old_constraint_name);
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_store_id_customer_id_key" UNIQUE ("store_id", "customer_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Storefront reads approved reviews for one store, newest first.
CREATE INDEX IF NOT EXISTS "store_reviews_store_id_is_approved_idx"
  ON "public"."store_reviews" ("store_id", "is_approved", "created_at" DESC);
