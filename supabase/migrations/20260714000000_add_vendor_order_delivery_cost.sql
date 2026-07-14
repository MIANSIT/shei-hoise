-- Adds an optional delivery_cost to vendor_orders. Not every dispatch has a
-- courier/vehicle fee, so it defaults to 0 and only shows up in the invoice
-- summary when the owner actually enters something. It's billed to the
-- vendor: grand_total = subtotal + delivery_cost - discount_amount.

ALTER TABLE "public"."vendor_orders"
  ADD COLUMN IF NOT EXISTS "delivery_cost" numeric(12,2) DEFAULT 0 NOT NULL;
