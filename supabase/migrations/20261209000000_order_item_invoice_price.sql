-- Quick Sale: a line can be sold at a different MRP on the invoice (e.g. a
-- platform that adds its service charge). unit_price stays the product's own
-- price; the difference is booked in orders.additional_charges.
-- NULL means the invoice shows unit_price, as before.
ALTER TABLE "public"."order_items"
  ADD COLUMN IF NOT EXISTS "invoice_unit_price" numeric(10,2);
