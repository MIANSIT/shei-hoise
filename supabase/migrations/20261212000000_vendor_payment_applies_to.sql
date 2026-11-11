-- A vendor payment pinned to an invoice can say what it pays: the goods or the delivery charge.
--
-- applies_to = 'goods' | 'delivery', or NULL (not said: it pays the goods first, then the delivery charge, as before).
-- Only used together with vendor_order_id. It changes how an invoice shows goods and delivery paid; the vendor's
-- total due, the profit and the dashboard do not change.
--
-- Additive and safe to apply before the code ships.

ALTER TABLE "public"."vendor_payments"
  ADD COLUMN IF NOT EXISTS "applies_to" text;

ALTER TABLE "public"."vendor_payments" DROP CONSTRAINT IF EXISTS "vendor_payments_applies_to_check";
ALTER TABLE ONLY "public"."vendor_payments"
  ADD CONSTRAINT "vendor_payments_applies_to_check" CHECK ("applies_to" IS NULL OR "applies_to" IN ('goods', 'delivery'));

NOTIFY pgrst, 'reload schema';
