-- Every vendor money field was guarded only by a client-side InputNumber
-- min={0}, with no Zod schema and no DB CHECK constraint. A discount larger
-- than the subtotal, or a bad unit price, could save a negative
-- grand_total/due_amount that then flows into every downstream vendor
-- statistic. These floors back the client-side validation (added
-- alongside this migration) with a real database guarantee.

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_orders"
    ADD CONSTRAINT "vendor_orders_grand_total_check" CHECK ("grand_total" >= 0);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_order_items"
    ADD CONSTRAINT "vendor_order_items_vendor_tp_check" CHECK ("vendor_tp" >= 0);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_order_items"
    ADD CONSTRAINT "vendor_order_items_original_tp_check" CHECK ("original_tp" >= 0);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_order_items"
    ADD CONSTRAINT "vendor_order_items_mrp_check" CHECK ("mrp" IS NULL OR "mrp" >= 0);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlement_items"
    ADD CONSTRAINT "vendor_settlement_items_unit_price_check" CHECK ("unit_price" >= 0);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
