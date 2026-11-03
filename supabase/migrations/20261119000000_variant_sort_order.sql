-- Variants keep the order the owner arranged them in.
--
-- The product form now lets the owner drag a variant (or use the arrows) to change
-- its place. That order is saved here and used by the product edit form and the
-- storefront product page. Until now variants had no order of their own and came
-- back in whatever order the database returned them.
--
-- Additive: a column with a default, so running code is untouched. The app saves
-- and reads the order in separate calls that are skipped if this column is not
-- there yet, so applying this before or after the code is safe.
ALTER TABLE "public"."product_variants"
  ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;

-- Existing variants start in the order they were created.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at, id) - 1 AS pos
  FROM "public"."product_variants"
)
UPDATE "public"."product_variants" v
   SET "sort_order" = r.pos
  FROM ranked r
 WHERE v.id = r.id
   AND v."sort_order" = 0
   AND r.pos > 0;
