-- Closes the cross-tenant gap in the vendor/inventory RPCs found during the
-- 2026-08-21 codebase audit: every one of these functions is called through
-- supabaseAdmin (service_role), which bypasses RLS entirely, and none of
-- them independently verified that the row being touched belongs to the
-- store making the call — the TypeScript wrapper was the only gate, and in
-- several cases it wasn't checking either. See the matching TS-side fixes in
-- src/lib/queries/vendorSettlement/recordVendorSettlement.ts,
-- src/lib/queries/vendorOrder/{confirm,cancel,addItemsToConfirmed}*.ts, and
-- src/lib/queries/inventory/updateInventory.ts, which now all pass the
-- caller's session-derived store_id into these functions.
--
-- record_vendor_settlement keeps its existing signature (it already took
-- p_store_id) — this migration only adds a body-level check that the vendor
-- actually belongs to that store.
--
-- confirm_vendor_order, cancel_vendor_order, add_items_to_confirmed_vendor_order,
-- adjust_inventory, and set_inventory did not previously take any store
-- parameter at all, so this migration adds a new REQUIRED trailing
-- p_caller_store_id parameter to each and checks it against the row's real
-- store before doing anything. Adding a parameter changes the function's
-- argument-type signature, so CREATE OR REPLACE FUNCTION alone would leave
-- the old (unprotected) signature registered as a separate overload rather
-- than replacing it — each one is explicitly DROPped first, mirroring how
-- record_vendor_settlement's own signature change was handled in
-- 20260713000000_add_vendor_payment_method.sql.

-- ── record_vendor_settlement ────────────────────────────────────────────────
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

-- ── confirm_vendor_order ────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."confirm_vendor_order"("uuid", "uuid");

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
      (store_id, vendor_id, amount, payment_date, notes, created_by)
    VALUES
      (v_order.store_id, v_order.vendor_id, v_order.paid_amount, v_order.order_date, 'Upfront payment - ' || v_order.invoice_number, p_created_by);
  END IF;
END;
$$;
ALTER FUNCTION "public"."confirm_vendor_order"("uuid", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."confirm_vendor_order"("uuid", "uuid", "uuid") TO "service_role";

-- ── cancel_vendor_order ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."cancel_vendor_order"("uuid", "uuid");

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
  SELECT id, store_id, vendor_id, status INTO v_order
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

  UPDATE public.vendor_orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_vendor_order_id;
END;
$$;

ALTER FUNCTION "public"."cancel_vendor_order"("uuid", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."cancel_vendor_order"("uuid", "uuid", "uuid") TO "service_role";

-- ── add_items_to_confirmed_vendor_order ─────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."add_items_to_confirmed_vendor_order"("uuid", "jsonb", "uuid");

CREATE OR REPLACE FUNCTION "public"."add_items_to_confirmed_vendor_order"(
    "p_vendor_order_id" "uuid",
    "p_items" "jsonb",
    "p_created_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order record;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_original_tp numeric;
  v_increase_percent numeric;
  v_vendor_tp numeric;
  v_mrp numeric;
  v_product_name text;
  v_sku text;
  v_prev_wh integer;
  v_new_wh integer;
  v_prev_vendor integer;
  v_new_vendor integer;
  v_added_subtotal numeric := 0;
  v_added_quantity integer := 0;
BEGIN
  SELECT id, store_id, vendor_id, status,
         subtotal, delivery_cost, discount_amount, paid_amount, total_quantity
  INTO v_order
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
    RAISE EXCEPTION 'Only confirmed orders can have items added (current status: %)', v_order.status;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id    := (v_item->>'product_id')::uuid;
    v_variant_id    := NULLIF(v_item->>'variant_id', '')::uuid;
    v_quantity      := (v_item->>'quantity')::integer;
    v_original_tp   := (v_item->>'original_tp')::numeric;
    v_increase_percent := COALESCE((v_item->>'increase_percent')::numeric, 0);
    v_vendor_tp     := (v_item->>'vendor_tp')::numeric;
    v_mrp           := NULLIF(v_item->>'mrp', '')::numeric;
    v_product_name  := v_item->>'product_name';
    v_sku           := v_item->>'sku';

    -- Decrement warehouse stock
    SELECT quantity_available INTO v_prev_wh
    FROM public.product_inventory
    WHERE product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No warehouse inventory for product %', v_product_id;
    END IF;

    IF v_prev_wh < v_quantity THEN
      RAISE EXCEPTION 'Insufficient warehouse stock for product %: have %, need %',
        v_product_id, v_prev_wh, v_quantity;
    END IF;

    v_new_wh := v_prev_wh - v_quantity;

    UPDATE public.product_inventory
    SET quantity_available = v_new_wh, updated_at = now()
    WHERE product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id;

    INSERT INTO public.stock_movements
      (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (v_product_id, v_variant_id, -v_quantity, v_prev_wh, v_new_wh,
       'vendor_dispatch', 'Added to vendor order ' || p_vendor_order_id, p_created_by);

    -- Upsert vendor stock
    SELECT quantity_available INTO v_prev_vendor
    FROM public.vendor_stock
    WHERE vendor_id = v_order.vendor_id
      AND product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_prev_vendor := 0;
      INSERT INTO public.vendor_stock
        (store_id, vendor_id, product_id, variant_id, quantity_available, last_vendor_tp)
      VALUES
        (v_order.store_id, v_order.vendor_id, v_product_id, v_variant_id, v_quantity, v_vendor_tp);
      v_new_vendor := v_quantity;
    ELSE
      v_new_vendor := v_prev_vendor + v_quantity;
      UPDATE public.vendor_stock
      SET quantity_available = v_new_vendor, last_vendor_tp = v_vendor_tp, updated_at = now()
      WHERE vendor_id = v_order.vendor_id
        AND product_id = v_product_id
        AND variant_id IS NOT DISTINCT FROM v_variant_id;
    END IF;

    INSERT INTO public.vendor_stock_movements
      (vendor_id, product_id, variant_id, delta, previous_quantity, new_quantity,
       reason, reference_type, reference_id, created_by)
    VALUES
      (v_order.vendor_id, v_product_id, v_variant_id, v_quantity, v_prev_vendor, v_new_vendor,
       'dispatch', 'vendor_order', p_vendor_order_id, p_created_by);

    INSERT INTO public.vendor_order_items
      (vendor_order_id, product_id, variant_id, product_name, sku,
       quantity, original_tp, increase_percent, vendor_tp, mrp, line_total)
    VALUES
      (p_vendor_order_id, v_product_id, v_variant_id, v_product_name, v_sku,
       v_quantity, v_original_tp, v_increase_percent, v_vendor_tp, v_mrp,
       v_quantity * v_vendor_tp);

    v_added_subtotal := v_added_subtotal + v_quantity * v_vendor_tp;
    v_added_quantity := v_added_quantity + v_quantity;
  END LOOP;

  -- Recalculate order totals with the new items
  UPDATE public.vendor_orders
  SET
    total_quantity = v_order.total_quantity + v_added_quantity,
    subtotal       = v_order.subtotal + v_added_subtotal,
    grand_total    = v_order.subtotal + v_added_subtotal + v_order.delivery_cost - v_order.discount_amount,
    due_amount     = v_order.subtotal + v_added_subtotal + v_order.delivery_cost - v_order.discount_amount - v_order.paid_amount,
    updated_at     = now()
  WHERE id = p_vendor_order_id;
END;
$$;

ALTER FUNCTION "public"."add_items_to_confirmed_vendor_order"("uuid", "jsonb", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."add_items_to_confirmed_vendor_order"("uuid", "jsonb", "uuid", "uuid") TO "service_role";

-- ── adjust_inventory ─────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."adjust_inventory"("uuid", "uuid", integer, character varying, "text", "uuid");

CREATE OR REPLACE FUNCTION "public"."adjust_inventory"(
    "p_product_id" "uuid",
    "p_variant_id" "uuid",
    "p_delta" integer,
    "p_reason" character varying DEFAULT 'manual_adjustment',
    "p_note" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS TABLE("previous_quantity" integer, "new_quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prev integer;
  v_new integer;
  v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id FROM public.products WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  IF v_store_id IS DISTINCT FROM p_caller_store_id THEN
    RAISE EXCEPTION 'Product % does not belong to store %', p_product_id, p_caller_store_id;
  END IF;

  SELECT quantity_available INTO v_prev
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product % / variant %', p_product_id, p_variant_id;
  END IF;

  v_new := v_prev + p_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: have %, requested change %', v_prev, p_delta;
  END IF;

  UPDATE public.product_inventory
  SET quantity_available = v_new, updated_at = now()
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  INSERT INTO public.stock_movements
    (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_delta, v_prev, v_new, COALESCE(p_reason, 'manual_adjustment'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, v_new;
END;
$$;
ALTER FUNCTION "public"."adjust_inventory"("uuid", "uuid", integer, character varying, "text", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."adjust_inventory"("uuid", "uuid", integer, character varying, "text", "uuid", "uuid") TO "service_role";

-- ── set_inventory ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS "public"."set_inventory"("uuid", "uuid", integer, character varying, "text", "uuid");

CREATE OR REPLACE FUNCTION "public"."set_inventory"(
    "p_product_id" "uuid",
    "p_variant_id" "uuid",
    "p_quantity" integer,
    "p_reason" character varying DEFAULT 'recount',
    "p_note" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_caller_store_id" "uuid" DEFAULT NULL
) RETURNS TABLE("previous_quantity" integer, "new_quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prev integer;
  v_store_id uuid;
BEGIN
  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  SELECT store_id INTO v_store_id FROM public.products WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  IF v_store_id IS DISTINCT FROM p_caller_store_id THEN
    RAISE EXCEPTION 'Product % does not belong to store %', p_product_id, p_caller_store_id;
  END IF;

  SELECT quantity_available INTO v_prev
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product % / variant %', p_product_id, p_variant_id;
  END IF;

  UPDATE public.product_inventory
  SET quantity_available = p_quantity, updated_at = now()
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  INSERT INTO public.stock_movements
    (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_quantity - v_prev, v_prev, p_quantity, COALESCE(p_reason, 'recount'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, p_quantity;
END;
$$;
ALTER FUNCTION "public"."set_inventory"("uuid", "uuid", integer, character varying, "text", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."set_inventory"("uuid", "uuid", integer, character varying, "text", "uuid", "uuid") TO "service_role";
