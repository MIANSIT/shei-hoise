-- Switch product reviews from verified-purchase-only to the standard
-- ecommerce model (Amazon, most Shopify review apps): any logged-in
-- customer can review a product once; a matching delivered order still
-- earns the "Verified Purchase" badge, but isn't required to review at
-- all. Verified-purchase-only meant a store with zero order history could
-- never get its first review — exactly the stores this feature was meant
-- to help most.
--
-- One review per customer per product now, regardless of order_id (which
-- becomes optional — set only when a verified order backs the review).
--
-- Finds the old (product_id, customer_id, order_id) unique constraint by
-- its columns rather than a hardcoded name — the name on this database
-- didn't match schema.sql's, so name-based DROP CONSTRAINT isn't reliable.

DO $$
DECLARE
  old_constraint_name text;
BEGIN
  SELECT con.conname INTO old_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'product_reviews'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(attr.attname::text ORDER BY attr.attname)
      FROM unnest(con.conkey) AS colnum
      JOIN pg_attribute attr ON attr.attrelid = con.conrelid AND attr.attnum = colnum
    ) = ARRAY['customer_id', 'order_id', 'product_id']
  LIMIT 1;

  IF old_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ONLY "public"."product_reviews" DROP CONSTRAINT %I', old_constraint_name);
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_customer_id_key" UNIQUE ("product_id", "customer_id");
-- duplicate_table (42P07): the constraint's backing index name collides —
-- raised instead of duplicate_object when re-run after it already exists.
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
