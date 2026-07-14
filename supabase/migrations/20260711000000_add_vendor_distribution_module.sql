-- Vendor Distribution & Vendor Order module.
--
-- Warehouse stock is the existing public.product_inventory table -- there is
-- no separate "warehouse" table in this app, so "warehouse stock" in the
-- feature spec maps directly to product_inventory.quantity_available.
--
-- Vendor stock is tracked as its own pool per (vendor, product, variant) in
-- vendor_stock. Confirming a vendor order moves quantity out of
-- product_inventory and into vendor_stock -- a stock transfer, not a sale.
-- Settlements later move quantity out of vendor_stock: some as "sold"
-- (recorded as receivable), some as "returned" (moved back into
-- product_inventory). All movements are logged to vendor_stock_movements,
-- mirroring the stock_movements/adjust_inventory pattern already used for
-- product_inventory.
--
-- Tenant isolation follows the rest of this app: a store_id column on every
-- table, filtered explicitly in application queries -- no RLS policies here,
-- consistent with products/orders/product_inventory.
--
-- Every "ADD CONSTRAINT" is wrapped in a DO block that swallows both
-- duplicate_object (42710, generic constraint-name conflicts) and
-- duplicate_table (42P07, raised when a UNIQUE/PRIMARY KEY constraint's
-- implicit backing index name conflicts) so this file is safe to re-run in
-- full after a partial failure.

-- -- vendors ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "phone" character varying(30) NOT NULL,
    "address" "text",
    "business_name" character varying(255),
    "notes" "text",
    "status" character varying(20) DEFAULT 'active' NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendors_status_check" CHECK ((("status")::"text" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);
ALTER TABLE "public"."vendors" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendors_store_id_idx" ON "public"."vendors" ("store_id");

GRANT ALL ON TABLE "public"."vendors" TO "service_role";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "anon";

-- -- vendor_stock: current pool held by each vendor ---------------------
CREATE TABLE IF NOT EXISTS "public"."vendor_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "quantity_available" integer DEFAULT 0 NOT NULL,
    "last_vendor_tp" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendor_stock_quantity_available_check" CHECK ("quantity_available" >= 0)
);
ALTER TABLE "public"."vendor_stock" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock"
    ADD CONSTRAINT "vendor_stock_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock"
    ADD CONSTRAINT "vendor_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock"
    ADD CONSTRAINT "vendor_stock_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock"
    ADD CONSTRAINT "vendor_stock_vendor_id_product_id_variant_id_key" UNIQUE ("vendor_id", "product_id", "variant_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_stock_store_id_idx" ON "public"."vendor_stock" ("store_id");
CREATE INDEX IF NOT EXISTS "vendor_stock_vendor_id_idx" ON "public"."vendor_stock" ("vendor_id");
CREATE INDEX IF NOT EXISTS "vendor_stock_product_id_idx" ON "public"."vendor_stock" ("product_id");

GRANT ALL ON TABLE "public"."vendor_stock" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_stock" TO "anon";

-- -- vendor_orders: dispatch / invoice header ----------------------------
CREATE TABLE IF NOT EXISTS "public"."vendor_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'draft' NOT NULL,
    "order_date" "date" NOT NULL,
    "invoice_date" "date",
    "delivery_date" "date",
    "delivery_person" character varying(255),
    "vehicle_number" character varying(100),
    "reference_number" character varying(100),
    "notes" "text",
    "total_quantity" integer DEFAULT 0 NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "due_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "confirmed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendor_orders_status_check" CHECK ((("status")::"text" = ANY (ARRAY['draft'::"text", 'confirmed'::"text", 'cancelled'::"text"])))
);
ALTER TABLE "public"."vendor_orders" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_orders"
    ADD CONSTRAINT "vendor_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_orders"
    ADD CONSTRAINT "vendor_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_orders"
    ADD CONSTRAINT "vendor_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_orders"
    ADD CONSTRAINT "vendor_orders_store_id_invoice_number_key" UNIQUE ("store_id", "invoice_number");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_orders_store_id_idx" ON "public"."vendor_orders" ("store_id");
CREATE INDEX IF NOT EXISTS "vendor_orders_vendor_id_idx" ON "public"."vendor_orders" ("vendor_id");
CREATE INDEX IF NOT EXISTS "vendor_orders_status_idx" ON "public"."vendor_orders" ("status");
CREATE INDEX IF NOT EXISTS "vendor_orders_order_date_idx" ON "public"."vendor_orders" ("order_date" DESC);

GRANT ALL ON TABLE "public"."vendor_orders" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_orders" TO "anon";

-- -- vendor_order_items: line items (price snapshot at dispatch time) ---
CREATE TABLE IF NOT EXISTS "public"."vendor_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "product_name" character varying(255) NOT NULL,
    "sku" character varying(100),
    "quantity" integer NOT NULL,
    "original_tp" numeric(10,2) NOT NULL,
    "increase_percent" numeric(6,2) DEFAULT 0 NOT NULL,
    "vendor_tp" numeric(10,2) NOT NULL,
    "mrp" numeric(10,2),
    "line_total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendor_order_items_quantity_check" CHECK ("quantity" > 0)
);
ALTER TABLE "public"."vendor_order_items" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_order_items"
    ADD CONSTRAINT "vendor_order_items_vendor_order_id_fkey" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_order_items"
    ADD CONSTRAINT "vendor_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_order_items"
    ADD CONSTRAINT "vendor_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_order_items_vendor_order_id_idx" ON "public"."vendor_order_items" ("vendor_order_id");
CREATE INDEX IF NOT EXISTS "vendor_order_items_product_id_idx" ON "public"."vendor_order_items" ("product_id");

GRANT ALL ON TABLE "public"."vendor_order_items" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_order_items" TO "anon";

-- -- vendor_settlements: one row per owner visit / settlement event -----
CREATE TABLE IF NOT EXISTS "public"."vendor_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "settlement_date" "date" NOT NULL,
    "notes" "text",
    "total_receivable" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_payment" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id")
);
ALTER TABLE "public"."vendor_settlements" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlements"
    ADD CONSTRAINT "vendor_settlements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlements"
    ADD CONSTRAINT "vendor_settlements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlements"
    ADD CONSTRAINT "vendor_settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_settlements_vendor_id_idx" ON "public"."vendor_settlements" ("vendor_id");
CREATE INDEX IF NOT EXISTS "vendor_settlements_settlement_date_idx" ON "public"."vendor_settlements" ("settlement_date" DESC);

GRANT ALL ON TABLE "public"."vendor_settlements" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_settlements" TO "anon";

-- -- vendor_settlement_items: per-product sold/returned in a settlement -
CREATE TABLE IF NOT EXISTS "public"."vendor_settlement_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settlement_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "sold_quantity" integer DEFAULT 0 NOT NULL,
    "returned_quantity" integer DEFAULT 0 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "receivable_amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendor_settlement_items_sold_quantity_check" CHECK ("sold_quantity" >= 0),
    CONSTRAINT "vendor_settlement_items_returned_quantity_check" CHECK ("returned_quantity" >= 0)
);
ALTER TABLE "public"."vendor_settlement_items" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlement_items"
    ADD CONSTRAINT "vendor_settlement_items_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."vendor_settlements"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlement_items"
    ADD CONSTRAINT "vendor_settlement_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_settlement_items"
    ADD CONSTRAINT "vendor_settlement_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_settlement_items_settlement_id_idx" ON "public"."vendor_settlement_items" ("settlement_id");
CREATE INDEX IF NOT EXISTS "vendor_settlement_items_product_id_idx" ON "public"."vendor_settlement_items" ("product_id");

GRANT ALL ON TABLE "public"."vendor_settlement_items" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_settlement_items" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_settlement_items" TO "anon";

-- -- vendor_payments: every payment received from a vendor --------------
CREATE TABLE IF NOT EXISTS "public"."vendor_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "settlement_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "payment_date" "date" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendor_payments_amount_check" CHECK ("amount" > 0)
);
ALTER TABLE "public"."vendor_payments" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."vendor_settlements"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_payments_vendor_id_idx" ON "public"."vendor_payments" ("vendor_id");
CREATE INDEX IF NOT EXISTS "vendor_payments_payment_date_idx" ON "public"."vendor_payments" ("payment_date" DESC);

GRANT ALL ON TABLE "public"."vendor_payments" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_payments" TO "anon";

-- -- vendor_stock_movements: append-only audit trail for vendor_stock ---
CREATE TABLE IF NOT EXISTS "public"."vendor_stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "delta" integer NOT NULL,
    "previous_quantity" integer NOT NULL,
    "new_quantity" integer NOT NULL,
    "reason" character varying(50) NOT NULL,
    "reference_type" character varying(30),
    "reference_id" "uuid",
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "vendor_stock_movements_reason_check" CHECK ((("reason")::"text" = ANY (ARRAY['dispatch'::"text", 'sold'::"text", 'returned'::"text", 'manual_adjustment'::"text"])))
);
ALTER TABLE "public"."vendor_stock_movements" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock_movements"
    ADD CONSTRAINT "vendor_stock_movements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock_movements"
    ADD CONSTRAINT "vendor_stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock_movements"
    ADD CONSTRAINT "vendor_stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_stock_movements"
    ADD CONSTRAINT "vendor_stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_stock_movements_vendor_id_idx" ON "public"."vendor_stock_movements" ("vendor_id");
CREATE INDEX IF NOT EXISTS "vendor_stock_movements_product_id_idx" ON "public"."vendor_stock_movements" ("product_id");
CREATE INDEX IF NOT EXISTS "vendor_stock_movements_created_at_idx" ON "public"."vendor_stock_movements" ("created_at" DESC);

GRANT ALL ON TABLE "public"."vendor_stock_movements" TO "service_role";
GRANT ALL ON TABLE "public"."vendor_stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_stock_movements" TO "anon";

-- -- confirm_vendor_order: atomic warehouse -> vendor stock transfer ----
-- Locks every affected product_inventory row (ordered by product_id to
-- avoid deadlocks against concurrent confirmations), verifies each item has
-- enough warehouse stock (blocks the whole order if not -- per business
-- rule, no overdraft), then decrements product_inventory and upserts
-- vendor_stock for every line item in one transaction. Logs both
-- stock_movements (reason='vendor_dispatch') and vendor_stock_movements
-- (reason='dispatch').
CREATE OR REPLACE FUNCTION "public"."confirm_vendor_order"(
    "p_vendor_order_id" "uuid",
    "p_created_by" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order record;
  v_item record;
  v_prev_wh integer;
  v_new_wh integer;
  v_prev_vendor integer;
  v_new_vendor integer;
BEGIN
  SELECT id, store_id, vendor_id, status INTO v_order
  FROM public.vendor_orders
  WHERE id = p_vendor_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor order % not found', p_vendor_order_id;
  END IF;

  IF v_order.status <> 'draft' THEN
    RAISE EXCEPTION 'Vendor order % is not in draft status (current: %)', p_vendor_order_id, v_order.status;
  END IF;

  FOR v_item IN
    SELECT product_id, variant_id, quantity, vendor_tp
    FROM public.vendor_order_items
    WHERE vendor_order_id = p_vendor_order_id
    ORDER BY product_id, variant_id
  LOOP
    SELECT quantity_available INTO v_prev_wh
    FROM public.product_inventory
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No warehouse inventory row for product % / variant %', v_item.product_id, v_item.variant_id;
    END IF;

    IF v_prev_wh < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient warehouse stock for product %: have %, need %', v_item.product_id, v_prev_wh, v_item.quantity;
    END IF;

    v_new_wh := v_prev_wh - v_item.quantity;

    UPDATE public.product_inventory
    SET quantity_available = v_new_wh, updated_at = now()
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id;

    INSERT INTO public.stock_movements
      (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (v_item.product_id, v_item.variant_id, -v_item.quantity, v_prev_wh, v_new_wh, 'vendor_dispatch', 'Vendor order ' || p_vendor_order_id, p_created_by);

    SELECT quantity_available INTO v_prev_vendor
    FROM public.vendor_stock
    WHERE vendor_id = v_order.vendor_id
      AND product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_prev_vendor := 0;
      INSERT INTO public.vendor_stock
        (store_id, vendor_id, product_id, variant_id, quantity_available, last_vendor_tp)
      VALUES
        (v_order.store_id, v_order.vendor_id, v_item.product_id, v_item.variant_id, v_item.quantity, v_item.vendor_tp);
      v_new_vendor := v_item.quantity;
    ELSE
      v_new_vendor := v_prev_vendor + v_item.quantity;
      UPDATE public.vendor_stock
      SET quantity_available = v_new_vendor, last_vendor_tp = v_item.vendor_tp, updated_at = now()
      WHERE vendor_id = v_order.vendor_id
        AND product_id = v_item.product_id
        AND variant_id IS NOT DISTINCT FROM v_item.variant_id;
    END IF;

    INSERT INTO public.vendor_stock_movements
      (vendor_id, product_id, variant_id, delta, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
    VALUES
      (v_order.vendor_id, v_item.product_id, v_item.variant_id, v_item.quantity, v_prev_vendor, v_new_vendor, 'dispatch', 'vendor_order', p_vendor_order_id, p_created_by);
  END LOOP;

  UPDATE public.vendor_orders
  SET status = 'confirmed', confirmed_at = now(), updated_at = now()
  WHERE id = p_vendor_order_id;
END;
$$;
ALTER FUNCTION "public"."confirm_vendor_order"("uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."confirm_vendor_order"("uuid", "uuid") TO "service_role";

-- -- record_vendor_settlement: sold/returned/payment in one transaction -
-- p_items is a JSON array of {product_id, variant_id, sold_quantity,
-- returned_quantity, unit_price}. unit_price is supplied by the caller
-- (defaults client-side to vendor_stock.last_vendor_tp but the owner may
-- override it per line -- necessary because a vendor's pooled stock can mix
-- goods dispatched at different vendor TPs over time).
CREATE OR REPLACE FUNCTION "public"."record_vendor_settlement"(
    "p_vendor_id" "uuid",
    "p_store_id" "uuid",
    "p_settlement_date" "date",
    "p_items" "jsonb",
    "p_payment_amount" numeric DEFAULT 0,
    "p_notes" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_settlement_id uuid;
  v_payment_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_sold integer;
  v_returned integer;
  v_unit_price numeric(10,2);
  v_prev_vendor integer;
  v_new_vendor integer;
  v_total_out integer;
  v_receivable numeric(12,2);
  v_total_receivable numeric(12,2) := 0;
  v_prev_wh integer;
  v_new_wh integer;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one settlement item is required';
  END IF;

  INSERT INTO public.vendor_settlements
    (store_id, vendor_id, settlement_date, notes, total_receivable, total_payment, created_by)
  VALUES
    (p_store_id, p_vendor_id, p_settlement_date, p_notes, 0, GREATEST(p_payment_amount, 0), p_created_by)
  RETURNING id INTO v_settlement_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := NULLIF(v_item->>'variant_id', '')::uuid;
    v_sold := COALESCE((v_item->>'sold_quantity')::integer, 0);
    v_returned := COALESCE((v_item->>'returned_quantity')::integer, 0);
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_total_out := v_sold + v_returned;

    IF v_total_out <= 0 THEN
      CONTINUE;
    END IF;

    SELECT quantity_available INTO v_prev_vendor
    FROM public.vendor_stock
    WHERE vendor_id = p_vendor_id
      AND product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No vendor stock row for vendor % / product % / variant %', p_vendor_id, v_product_id, v_variant_id;
    END IF;

    IF v_prev_vendor < v_total_out THEN
      RAISE EXCEPTION 'Insufficient vendor stock for product %: have %, need %', v_product_id, v_prev_vendor, v_total_out;
    END IF;

    v_new_vendor := v_prev_vendor - v_total_out;

    UPDATE public.vendor_stock
    SET quantity_available = v_new_vendor, updated_at = now()
    WHERE vendor_id = p_vendor_id
      AND product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id;

    v_receivable := v_sold * v_unit_price;
    v_total_receivable := v_total_receivable + v_receivable;

    INSERT INTO public.vendor_settlement_items
      (settlement_id, product_id, variant_id, sold_quantity, returned_quantity, unit_price, receivable_amount)
    VALUES
      (v_settlement_id, v_product_id, v_variant_id, v_sold, v_returned, v_unit_price, v_receivable);

    IF v_sold > 0 THEN
      INSERT INTO public.vendor_stock_movements
        (vendor_id, product_id, variant_id, delta, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
      VALUES
        (p_vendor_id, v_product_id, v_variant_id, -v_sold, v_prev_vendor, v_prev_vendor - v_sold, 'sold', 'vendor_settlement', v_settlement_id, p_created_by);
    END IF;

    IF v_returned > 0 THEN
      INSERT INTO public.vendor_stock_movements
        (vendor_id, product_id, variant_id, delta, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
      VALUES
        (p_vendor_id, v_product_id, v_variant_id, -v_returned, v_prev_vendor - v_sold, v_new_vendor, 'returned', 'vendor_settlement', v_settlement_id, p_created_by);

      -- Auto-return: goods physically come back, so warehouse stock rises.
      SELECT quantity_available INTO v_prev_wh
      FROM public.product_inventory
      WHERE product_id = v_product_id
        AND variant_id IS NOT DISTINCT FROM v_variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No warehouse inventory row for product % / variant %', v_product_id, v_variant_id;
      END IF;

      v_new_wh := v_prev_wh + v_returned;

      UPDATE public.product_inventory
      SET quantity_available = v_new_wh, updated_at = now()
      WHERE product_id = v_product_id
        AND variant_id IS NOT DISTINCT FROM v_variant_id;

      INSERT INTO public.stock_movements
        (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
      VALUES
        (v_product_id, v_variant_id, v_returned, v_prev_wh, v_new_wh, 'vendor_return', 'Vendor settlement ' || v_settlement_id, p_created_by);
    END IF;
  END LOOP;

  UPDATE public.vendor_settlements
  SET total_receivable = v_total_receivable
  WHERE id = v_settlement_id;

  IF p_payment_amount > 0 THEN
    INSERT INTO public.vendor_payments
      (store_id, vendor_id, settlement_id, amount, payment_date, notes, created_by)
    VALUES
      (p_store_id, p_vendor_id, v_settlement_id, p_payment_amount, p_settlement_date, p_notes, p_created_by)
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN v_settlement_id;
END;
$$;
ALTER FUNCTION "public"."record_vendor_settlement"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."record_vendor_settlement"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid") TO "service_role";
