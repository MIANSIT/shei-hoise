-- Order items previously had no record of what a product actually cost the
-- store on the day it sold — profit/COGS was recomputed later by joining to
-- the product's *current* tp_price, so raising a product's cost today
-- silently re-priced every past order that ever sold it, including months
-- already "closed." Recording the real cost at the moment of sale fixes
-- that: historical rows keep the price that was true when the sale
-- happened. Nullable because existing rows have no such record — the
-- dashboard falls back to today's tp_price only for those legacy rows.

ALTER TABLE "public"."order_items"
  ADD COLUMN IF NOT EXISTS "cost_price" numeric(10,2);
