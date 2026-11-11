-- A coupon can be limited to some categories.
--
-- coupons.category_ids empty = the coupon works on every product (as before). With categories picked, the discount
-- is worked out on the cart lines whose product sits in any of those categories only, and the minimum order and the
-- maximum discount are checked against those lines.
--
-- Additive and safe to apply before the code ships: every existing coupon keeps an empty list.
-- Products can sit in several categories from 20261210000000_product_multiple_categories.sql; apply that first so
-- the products.category_ids column exists (without it the coupon check falls back to each product's main category).

ALTER TABLE "public"."coupons"
  ADD COLUMN IF NOT EXISTS "category_ids" uuid[] DEFAULT '{}' NOT NULL;

NOTIFY pgrst, 'reload schema';
