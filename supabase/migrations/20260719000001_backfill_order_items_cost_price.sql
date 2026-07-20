-- One-time backfill for order_items placed before cost_price existed.
-- The real cost as of each order's own date was never recorded, so it
-- can't be recovered — this freezes those rows at today's tp_price
-- instead, so their profit stops drifting every time a product's cost
-- changes from here on. Only touches rows that are still NULL; any
-- order_items already carrying a real cost_price (orders placed after
-- the app-side fix) are left untouched.

UPDATE "public"."order_items" oi
SET "cost_price" = COALESCE(
  (SELECT pv."tp_price" FROM "public"."product_variants" pv WHERE pv."id" = oi."variant_id"),
  (SELECT p."tp_price" FROM "public"."products" p WHERE p."id" = oi."product_id")
)
WHERE oi."cost_price" IS NULL;
