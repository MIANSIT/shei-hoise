-- add_items_to_confirmed_vendor_order
--
-- Appends new line items to an already-confirmed vendor order and immediately
-- transfers their stock from warehouse → vendor_stock, exactly the same way
-- confirm_vendor_order does — so the single order stays the source of truth
-- for everything dispatched to that vendor under one invoice.
--
-- p_items: jsonb array of {product_id, variant_id, quantity, original_tp,
--           increase_percent, vendor_tp, mrp, product_name, sku}

CREATE OR REPLACE FUNCTION "public"."add_items_to_confirmed_vendor_order"(
    "p_vendor_order_id" "uuid",
    "p_items" "jsonb",
    "p_created_by" "uuid" DEFAULT NULL
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

ALTER FUNCTION "public"."add_items_to_confirmed_vendor_order"("uuid", "jsonb", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."add_items_to_confirmed_vendor_order"("uuid", "jsonb", "uuid") TO "service_role";
