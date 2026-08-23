-- Cancelling a confirmed vendor order correctly reversed stock but never
-- touched the upfront payment confirm_vendor_order logs to vendor_payments
-- (see 20260719000008) -- so a cancelled order's advance payment stayed
-- forever, permanently understating what the vendor actually owes, and
-- became an orphaned row (traceable only by grepping its free-text note)
-- if the cancelled order was later deleted.
--
-- Adds a nullable vendor_order_id link so cancel_vendor_order can find and
-- remove exactly that payment. ON DELETE SET NULL rather than CASCADE:
-- once cancel has already deleted the row, deleting the (now cancelled)
-- order afterward has nothing left to orphan, but a genuine settlement
-- payment (which never sets vendor_order_id) must never be touched by
-- deleting an order.

ALTER TABLE "public"."vendor_payments"
  ADD COLUMN IF NOT EXISTS "vendor_order_id" "uuid";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_vendor_order_id_fkey"
    FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "vendor_payments_vendor_order_id_idx" ON "public"."vendor_payments" ("vendor_order_id");

-- Backfill: link existing upfront-payment rows using the same note pattern
-- the 20260720000002 backfill already matched against ('Upfront payment -
-- <invoice_number>', no settlement_id).
UPDATE public.vendor_payments vp
SET vendor_order_id = vo.id
FROM public.vendor_orders vo
WHERE vp.settlement_id IS NULL
  AND vp.vendor_order_id IS NULL
  AND vp.vendor_id = vo.vendor_id
  AND vp.notes = 'Upfront payment - ' || vo.invoice_number;

-- confirm_vendor_order: set vendor_order_id on the upfront-payment insert.
-- Same 2-arg signature -- CREATE OR REPLACE only.
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
  SELECT id, store_id, vendor_id, status, paid_amount, order_date, invoice_number INTO v_order
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

  IF v_order.paid_amount > 0 THEN
    INSERT INTO public.vendor_payments
      (store_id, vendor_id, vendor_order_id, amount, payment_date, notes, created_by)
    VALUES
      (v_order.store_id, v_order.vendor_id, p_vendor_order_id, v_order.paid_amount, v_order.order_date, 'Upfront payment - ' || v_order.invoice_number, p_created_by);
  END IF;
END;
$$;
ALTER FUNCTION "public"."confirm_vendor_order"("uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."confirm_vendor_order"("uuid", "uuid") TO "service_role";

-- cancel_vendor_order: remove the upfront payment tied to this order (if
-- any) as part of reversing it. The settlement_id IS NULL guard means this
-- can only ever match the auto-inserted upfront payment above -- real
-- settlement payments always carry a settlement_id and never a
-- vendor_order_id, so they're untouched.
CREATE OR REPLACE FUNCTION "public"."cancel_vendor_order"(
    "p_vendor_order_id" "uuid",
    "p_cancelled_by" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order record;
  v_item record;
  v_prev_vendor integer;
  v_new_vendor integer;
  v_prev_wh integer;
  v_new_wh integer;
BEGIN
  SELECT id, store_id, vendor_id, status INTO v_order
  FROM public.vendor_orders
  WHERE id = p_vendor_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor order % not found', p_vendor_order_id;
  END IF;

  IF v_order.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed orders can be cancelled (current status: %)', v_order.status;
  END IF;

  FOR v_item IN
    SELECT product_id, variant_id, quantity
    FROM public.vendor_order_items
    WHERE vendor_order_id = p_vendor_order_id
    ORDER BY product_id, variant_id
  LOOP
    -- Decrement vendor stock
    SELECT quantity_available INTO v_prev_vendor
    FROM public.vendor_stock
    WHERE vendor_id = v_order.vendor_id
      AND product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No vendor stock row for product % / variant % — cannot reverse', v_item.product_id, v_item.variant_id;
    END IF;

    IF v_prev_vendor < v_item.quantity THEN
      RAISE EXCEPTION 'Vendor stock for product % is % but order had % — partial sales may have occurred; use settlement to reconcile', v_item.product_id, v_prev_vendor, v_item.quantity;
    END IF;

    v_new_vendor := v_prev_vendor - v_item.quantity;

    UPDATE public.vendor_stock
    SET quantity_available = v_new_vendor, updated_at = now()
    WHERE vendor_id = v_order.vendor_id
      AND product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id;

    INSERT INTO public.vendor_stock_movements
      (vendor_id, product_id, variant_id, delta, previous_quantity, new_quantity,
       reason, reference_type, reference_id, created_by)
    VALUES
      (v_order.vendor_id, v_item.product_id, v_item.variant_id,
       -v_item.quantity, v_prev_vendor, v_new_vendor,
       'returned', 'vendor_order', p_vendor_order_id, p_cancelled_by);

    -- Return stock to warehouse
    SELECT quantity_available INTO v_prev_wh
    FROM public.product_inventory
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No warehouse inventory row for product % / variant %', v_item.product_id, v_item.variant_id;
    END IF;

    v_new_wh := v_prev_wh + v_item.quantity;

    UPDATE public.product_inventory
    SET quantity_available = v_new_wh, updated_at = now()
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id;

    INSERT INTO public.stock_movements
      (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (v_item.product_id, v_item.variant_id, v_item.quantity, v_prev_wh, v_new_wh,
       'vendor_return', 'Cancelled vendor order ' || p_vendor_order_id, p_cancelled_by);
  END LOOP;

  DELETE FROM public.vendor_payments
  WHERE vendor_order_id = p_vendor_order_id
    AND settlement_id IS NULL;

  UPDATE public.vendor_orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_vendor_order_id;
END;
$$;

ALTER FUNCTION "public"."cancel_vendor_order"("uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."cancel_vendor_order"("uuid", "uuid") TO "service_role";
