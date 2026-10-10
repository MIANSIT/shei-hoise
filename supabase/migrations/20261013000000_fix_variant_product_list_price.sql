-- Data fix: products that have variants must carry the lowest variant price
-- as their product-level base_price, and no product-level discount.
--
-- The product form hides those fields once variants exist, so a price left
-- over from Duplicate (or typed before variants were added) was saved as-is
-- and shown on Quick Sale cards. The app now derives it on save; this repairs
-- rows saved before that. Lowest ACTIVE variant price, else lowest of any.
-- Idempotent: only touches rows that differ.

WITH variant_price AS (
  SELECT
    pv.product_id,
    COALESCE(
      MIN(pv.base_price) FILTER (WHERE pv.is_active AND pv.base_price > 0),
      MIN(pv.base_price) FILTER (WHERE pv.base_price > 0)
    ) AS list_price
  FROM "public"."product_variants" pv
  GROUP BY pv.product_id
)
UPDATE "public"."products" p
SET
  "base_price" = vp.list_price,
  "discounted_price" = NULL,
  "discount_amount" = NULL,
  "sale_starts_at" = NULL,
  "sale_ends_at" = NULL
FROM variant_price vp
WHERE p."id" = vp.product_id
  AND vp.list_price IS NOT NULL
  AND (
    p."base_price" IS DISTINCT FROM vp.list_price
    OR p."discounted_price" IS NOT NULL
    OR p."discount_amount" IS NOT NULL
    OR p."sale_starts_at" IS NOT NULL
    OR p."sale_ends_at" IS NOT NULL
  );
