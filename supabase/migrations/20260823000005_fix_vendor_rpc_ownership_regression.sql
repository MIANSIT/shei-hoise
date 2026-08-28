-- Corrective migration: 20260822000000_add_vendor_rpc_ownership_checks.sql
-- (already committed, closing a real cross-tenant data-isolation gap) was
-- authored and applied concurrently with this session's own Section-04
-- audit fixes. Because this session's exploration had read the *original*
-- confirm_vendor_order/cancel_vendor_order migration files rather than the
-- ownership-check migration that supersedes them, its own CREATE OR REPLACE
-- calls (20260823000000, 20260823000001, 20260823000004) either:
--   (a) silently reverted the store_id ownership check on
--       record_vendor_settlement (same signature both times, so the later
--       write won outright), or
--   (b) recreated confirm_vendor_order/cancel_vendor_order's OLD 2-argument
--       signature as a parallel, unprotected overload sitting alongside the
--       correct 3-argument (p_caller_store_id) version — the app only ever
--       calls the 3-arg version, but the insecure 2-arg decoy was still
--       live and callable.
--
-- This migration re-merges both sets of fixes into one correct body per
-- function, and drops the insecure decoy overloads entirely.

-- ── record_vendor_settlement: ownership check + null-price fix, together ──
CREATE OR REPLACE FUNCTION "public"."record_vendor_settlement"(
    "p_vendor_id" "uuid",
    "p_store_id" "uuid",
    "p_settlement_date" "date",
    "p_items" "jsonb",
    "p_payment_amount" numeric DEFAULT 0,
    "p_notes" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_payment_method" character varying DEFAULT 'cash'
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
  v_vendor_store_id uuid;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one settlement item is required';
  END IF;

  SELECT store_id INTO v_vendor_store_id FROM public.vendors WHERE id = p_vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor % not found', p_vendor_id;
  END IF;

  IF v_vendor_store_id IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'Vendor % does not belong to store %', p_vendor_id, p_store_id;
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
    v_unit_price := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_total_out := v_sold + v_returned;

    IF v_total_out <= 0 THEN
      CONTINUE;
    END IF;

    IF v_sold > 0 AND v_unit_price <= 0 THEN
      RAISE EXCEPTION 'Unit price is required for product % when recording a sold quantity', v_product_id;
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
      (store_id, vendor_id, settlement_id, amount, payment_date, notes, created_by, payment_method)
    VALUES
      (p_store_id, p_vendor_id, v_settlement_id, p_payment_amount, p_settlement_date, p_notes, p_created_by, COALESCE(p_payment_method, 'cash'))
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN v_settlement_id;
END;
$$;
ALTER FUNCTION "public"."record_vendor_settlement"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."record_vendor_settlement"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying) TO "service_role";

-- ── Drop the insecure 2-arg decoy overloads this session's own migrations
-- accidentally created alongside the real (3-arg, ownership-checked) ones.
DROP FUNCTION IF EXISTS "public"."confirm_vendor_order"("uuid", "uuid");
DROP FUNCTION IF EXISTS "public"."cancel_vendor_order"("uuid", "uuid");

-- ── confirm_vendor_order (3-arg, ownership-checked): keep the store check,
-- add the vendor_order_id link on the upfront payment so cancel can find it.
CREATE OR REPLACE FUNCTION "public"."confirm_vendor_order"(
    "p_vendor_order_id" "uuid",
    "p_created_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
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

  IF v_order.store_id IS DISTINCT FROM p_caller_store_id THEN
    RAISE EXCEPTION 'Vendor order % does not belong to store %', p_vendor_order_id, p_caller_store_id;
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
ALTER FUNCTION "public"."confirm_vendor_order"("uuid", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."confirm_vendor_order"("uuid", "uuid", "uuid") TO "service_role";

-- ── cancel_vendor_order (3-arg, ownership-checked): keep the store check,
-- add the upfront-payment cleanup, scoped to just that auto-inserted row.
CREATE OR REPLACE FUNCTION "public"."cancel_vendor_order"(
    "p_vendor_order_id" "uuid",
    "p_cancelled_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
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
  SELECT id, store_id, vendor_id, status, invoice_number INTO v_order
  FROM public.vendor_orders
  WHERE id = p_vendor_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor order % not found', p_vendor_order_id;
  END IF;

  IF v_order.store_id IS DISTINCT FROM p_caller_store_id THEN
    RAISE EXCEPTION 'Vendor order % does not belong to store %', p_vendor_order_id, p_caller_store_id;
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
    AND settlement_id IS NULL
    AND notes = 'Upfront payment - ' || v_order.invoice_number;

  UPDATE public.vendor_orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_vendor_order_id;
END;
$$;
ALTER FUNCTION "public"."cancel_vendor_order"("uuid", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."cancel_vendor_order"("uuid", "uuid", "uuid") TO "service_role";
