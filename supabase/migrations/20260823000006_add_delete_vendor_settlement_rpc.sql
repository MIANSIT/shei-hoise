-- Undo for a mistakenly-recorded settlement. A settlement moved real stock
-- (sold quantity left the vendor's pool permanently; returned quantity left
-- the vendor's pool AND landed back in the warehouse), so undoing it means
-- reversing both, not just deleting rows:
--   - both sold_quantity and returned_quantity go back into the vendor's
--     pool (either way, the units are still with the vendor — the mistake
--     was in how they got categorized, not that they left)
--   - the returned portion specifically also has to come back OUT of the
--     warehouse, guarded the same way cancel_vendor_order guards its own
--     reversal: if that warehouse stock has since been sold or dispatched
--     elsewhere, fail loudly rather than let quantity_available go negative
-- Then the settlement's items, the settlement row itself, and any payment
-- logged alongside it are all removed. Same store-ownership check pattern
-- as confirm/cancel_vendor_order (p_caller_store_id, required).

CREATE OR REPLACE FUNCTION "public"."delete_vendor_settlement"(
    "p_settlement_id" "uuid",
    "p_caller_store_id" "uuid" DEFAULT NULL,
    "p_deleted_by" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_settlement record;
  v_item record;
  v_prev_vendor integer;
  v_new_vendor integer;
  v_prev_wh integer;
  v_new_wh integer;
  v_total_back integer;
BEGIN
  SELECT id, vendor_id, store_id INTO v_settlement
  FROM public.vendor_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement % not found', p_settlement_id;
  END IF;

  IF v_settlement.store_id IS DISTINCT FROM p_caller_store_id THEN
    RAISE EXCEPTION 'Settlement % does not belong to store %', p_settlement_id, p_caller_store_id;
  END IF;

  FOR v_item IN
    SELECT product_id, variant_id, sold_quantity, returned_quantity
    FROM public.vendor_settlement_items
    WHERE settlement_id = p_settlement_id
    ORDER BY product_id, variant_id
  LOOP
    v_total_back := v_item.sold_quantity + v_item.returned_quantity;
    IF v_total_back <= 0 THEN
      CONTINUE;
    END IF;

    SELECT quantity_available INTO v_prev_vendor
    FROM public.vendor_stock
    WHERE vendor_id = v_settlement.vendor_id
      AND product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No vendor stock row for product % / variant % — cannot reverse settlement', v_item.product_id, v_item.variant_id;
    END IF;

    v_new_vendor := v_prev_vendor + v_total_back;

    UPDATE public.vendor_stock
    SET quantity_available = v_new_vendor, updated_at = now()
    WHERE vendor_id = v_settlement.vendor_id
      AND product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id;

    INSERT INTO public.vendor_stock_movements
      (vendor_id, product_id, variant_id, delta, previous_quantity, new_quantity, reason, reference_type, reference_id, created_by)
    VALUES
      (v_settlement.vendor_id, v_item.product_id, v_item.variant_id, v_total_back, v_prev_vendor, v_new_vendor, 'manual_adjustment', 'vendor_settlement_deleted', p_settlement_id, p_deleted_by);

    IF v_item.returned_quantity > 0 THEN
      SELECT quantity_available INTO v_prev_wh
      FROM public.product_inventory
      WHERE product_id = v_item.product_id
        AND variant_id IS NOT DISTINCT FROM v_item.variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No warehouse inventory row for product % / variant %', v_item.product_id, v_item.variant_id;
      END IF;

      IF v_prev_wh < v_item.returned_quantity THEN
        RAISE EXCEPTION 'Warehouse stock for product % is % but this settlement returned % — that stock has already moved elsewhere, cannot reverse automatically', v_item.product_id, v_prev_wh, v_item.returned_quantity;
      END IF;

      v_new_wh := v_prev_wh - v_item.returned_quantity;

      UPDATE public.product_inventory
      SET quantity_available = v_new_wh, updated_at = now()
      WHERE product_id = v_item.product_id
        AND variant_id IS NOT DISTINCT FROM v_item.variant_id;

      INSERT INTO public.stock_movements
        (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
      VALUES
        (v_item.product_id, v_item.variant_id, -v_item.returned_quantity, v_prev_wh, v_new_wh, 'manual_adjustment', 'Deleted vendor settlement ' || p_settlement_id, p_deleted_by);
    END IF;
  END LOOP;

  DELETE FROM public.vendor_payments WHERE settlement_id = p_settlement_id;
  DELETE FROM public.vendor_settlement_items WHERE settlement_id = p_settlement_id;
  DELETE FROM public.vendor_settlements WHERE id = p_settlement_id;
END;
$$;

ALTER FUNCTION "public"."delete_vendor_settlement"("uuid", "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."delete_vendor_settlement"("uuid", "uuid", "uuid") TO "service_role";
