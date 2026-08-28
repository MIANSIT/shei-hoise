-- Owners can now optionally pin a Record Payment to a specific invoice
-- (vendor_payments.vendor_order_id) so the per-invoice due table doesn't
-- have to rely on the oldest-first guess when the owner actually knows
-- which invoice a payment was for. That reuses the same vendor_order_id
-- column confirm_vendor_order sets on its auto-inserted upfront payment
-- (see 20260823000001) -- so cancel_vendor_order's cleanup, which deletes
-- by "vendor_order_id = this order AND settlement_id IS NULL", would now
-- also match and wrongly delete a user-pinned payment that has nothing to
-- do with the upfront-payment reversal.
--
-- Tighten the match to the upfront payment's own distinctive note as well,
-- so cancelling an order only ever removes ITS auto-inserted upfront
-- payment, never a payment a user deliberately pinned to it for an
-- unrelated reason.

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
  SELECT id, store_id, vendor_id, status, invoice_number INTO v_order
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
    AND settlement_id IS NULL
    AND notes = 'Upfront payment - ' || v_order.invoice_number;

  UPDATE public.vendor_orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_vendor_order_id;
END;
$$;

ALTER FUNCTION "public"."cancel_vendor_order"("uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."cancel_vendor_order"("uuid", "uuid") TO "service_role";
