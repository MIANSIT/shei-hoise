-- Vendor upfront/advance payment (vendor_orders.paid_amount) was only ever
-- stored on the vendor_orders row itself and never inserted into
-- vendor_payments -- so getVendorDashboardStats' totalPaid (summed from
-- vendor_payments) silently excluded it, making current_due overstate what
-- the vendor actually owes by exactly their upfront payment. Recorded at
-- CONFIRM time (not draft creation), since that's when goods actually move
-- and the payment becomes real -- a draft can still be edited or discarded.
-- settlement_id is left NULL: this isn't tied to a settlement, and the
-- column is nullable for exactly this case.
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
      (store_id, vendor_id, amount, payment_date, notes, created_by)
    VALUES
      (v_order.store_id, v_order.vendor_id, v_order.paid_amount, v_order.order_date, 'Upfront payment - ' || v_order.invoice_number, p_created_by);
  END IF;
END;
$$;
ALTER FUNCTION "public"."confirm_vendor_order"("uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."confirm_vendor_order"("uuid", "uuid") TO "service_role";
