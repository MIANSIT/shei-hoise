-- Vendor returns after a settlement.
--
-- A settlement only lists goods the vendor still holds, so once everything was
-- settled as sold and paid, a later return (2 or 3 items brought back) could not
-- be entered. This adds "record_vendor_return": goods the vendor already bought
-- come back into the shop's stock, and the vendor gets a credit for them.
--
--   * The return is stored as a settlement row with a NEGATIVE total_receivable
--     (and items whose receivable_amount is negative). Every figure that adds up
--     settlement receivables (what the vendor owes, the vendor list, the
--     statement) then drops by the credit with no other change. A normal
--     settlement can never be negative, so that is how a return is told apart.
--   * A cash refund is a NEGATIVE vendor_payments row linked to the return. It
--     adds back to what the vendor owes (the credit is paid out) and reads as
--     money going out on that payment method in Money Overview.
--   * The vendor's own stock pool is not touched: these goods were already sold
--     out of it.
--
-- Also changes delete_vendor_settlement so deleting a return takes the goods back
-- out of the shop's stock instead of putting them into the vendor's pool.
--
-- Requires 20261005000000_add_vendor_branches.sql. Additive apart from the
-- vendor_payments amount check, which now allows a negative amount (refund) but
-- still not zero. Existing rows and running code are unaffected.

-- 1. A refund to the vendor is a negative payment -----------------------------
ALTER TABLE "public"."vendor_payments" DROP CONSTRAINT IF EXISTS "vendor_payments_amount_check";
DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_amount_check" CHECK ("amount" <> 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. record_vendor_return -----------------------------------------------------
-- p_items: [{"product_id", "variant_id" (null for none), "quantity", "unit_price"}].
-- unit_price is what the vendor paid per unit (the credit per unit).
CREATE OR REPLACE FUNCTION "public"."record_vendor_return"(
    "p_vendor_id" "uuid",
    "p_store_id" "uuid",
    "p_return_date" "date",
    "p_items" "jsonb",
    "p_refund_amount" numeric DEFAULT 0,
    "p_notes" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_payment_method" character varying DEFAULT 'cash'
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_vendor_store_id uuid;
  v_return_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_qty integer;
  v_unit_price numeric(10,2);
  v_bought integer;
  v_given_back integer;
  v_prev_wh integer;
  v_new_wh integer;
  v_credit numeric(12,2);
  v_total_credit numeric(12,2) := 0;
  v_lines integer := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one returned item is required';
  END IF;

  IF COALESCE(p_refund_amount, 0) < 0 THEN
    RAISE EXCEPTION 'The refund cannot be negative';
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
    (p_store_id, p_vendor_id, p_return_date, COALESCE(p_notes, 'Return after sale'), 0, 0, p_created_by)
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := NULLIF(v_item->>'variant_id', '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    v_unit_price := COALESCE((v_item->>'unit_price')::numeric, 0);

    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    IF v_unit_price <= 0 THEN
      RAISE EXCEPTION 'A price is required for product % to work out the credit', v_product_id;
    END IF;

    -- Only goods this vendor really bought (settled as sold) and has not already
    -- given back can be returned, so a credit can never exceed what they paid for.
    SELECT COALESCE(SUM(i.sold_quantity), 0) INTO v_bought
    FROM public.vendor_settlement_items i
    JOIN public.vendor_settlements s ON s.id = i.settlement_id
    WHERE s.vendor_id = p_vendor_id
      AND i.product_id = v_product_id
      AND i.variant_id IS NOT DISTINCT FROM v_variant_id
      AND i.receivable_amount >= 0;

    SELECT COALESCE(SUM(i.returned_quantity), 0) INTO v_given_back
    FROM public.vendor_settlement_items i
    JOIN public.vendor_settlements s ON s.id = i.settlement_id
    WHERE s.vendor_id = p_vendor_id
      AND i.product_id = v_product_id
      AND i.variant_id IS NOT DISTINCT FROM v_variant_id
      AND i.receivable_amount < 0;

    IF v_qty > v_bought - v_given_back THEN
      RAISE EXCEPTION 'Only % of product % can be returned after sale (bought %, already returned %)',
        GREATEST(v_bought - v_given_back, 0), v_product_id, v_bought, v_given_back;
    END IF;

    v_credit := v_qty * v_unit_price;
    v_total_credit := v_total_credit + v_credit;
    v_lines := v_lines + 1;

    INSERT INTO public.vendor_settlement_items
      (settlement_id, product_id, variant_id, sold_quantity, returned_quantity, unit_price, receivable_amount)
    VALUES
      (v_return_id, v_product_id, v_variant_id, 0, v_qty, v_unit_price, -v_credit);

    -- The goods are physically back: shop stock rises (into the branch set by the wrapper).
    SELECT quantity_available INTO v_prev_wh
    FROM public.product_inventory
    WHERE product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No warehouse inventory row for product % / variant %', v_product_id, v_variant_id;
    END IF;

    v_new_wh := v_prev_wh + v_qty;

    UPDATE public.product_inventory
    SET quantity_available = v_new_wh, updated_at = now()
    WHERE product_id = v_product_id
      AND variant_id IS NOT DISTINCT FROM v_variant_id;

    INSERT INTO public.stock_movements
      (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (v_product_id, v_variant_id, v_qty, v_prev_wh, v_new_wh, 'vendor_return', 'Vendor return after sale ' || v_return_id, p_created_by);
  END LOOP;

  IF v_lines = 0 THEN
    RAISE EXCEPTION 'Enter a quantity for at least one product';
  END IF;

  UPDATE public.vendor_settlements
  SET total_receivable = -v_total_credit
  WHERE id = v_return_id;

  IF COALESCE(p_refund_amount, 0) > 0 THEN
    IF p_refund_amount > v_total_credit + 0.005 THEN
      RAISE EXCEPTION 'The refund (%) cannot be more than the value of the returned goods (%)', p_refund_amount, v_total_credit;
    END IF;
    INSERT INTO public.vendor_payments
      (store_id, vendor_id, settlement_id, amount, payment_date, notes, created_by, payment_method)
    VALUES
      (p_store_id, p_vendor_id, v_return_id, -p_refund_amount, p_return_date,
       COALESCE(p_notes, 'Refund for returned goods'), p_created_by, COALESCE(p_payment_method, 'cash'));
  END IF;

  RETURN v_return_id;
END;
$$;
ALTER FUNCTION "public"."record_vendor_return"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying) OWNER TO "postgres";

-- 3. Branch wrapper: the goods (and the refund) land in / go out of p_branch_id ---
CREATE OR REPLACE FUNCTION "public"."record_vendor_return_at_branch"(
    "p_vendor_id" "uuid",
    "p_store_id" "uuid",
    "p_return_date" "date",
    "p_items" "jsonb",
    "p_refund_amount" numeric DEFAULT 0,
    "p_notes" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL,
    "p_payment_method" character varying DEFAULT 'cash',
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch uuid;
  v_return uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = p_store_id) THEN
    v_branch := COALESCE(p_branch_id, public.default_store_branch(p_store_id));
    IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = v_branch AND store_id = p_store_id) THEN
      RAISE EXCEPTION 'Choose a branch of this store';
    END IF;
    PERFORM public.set_inventory_branch(v_branch);
  END IF;

  v_return := public.record_vendor_return(
    p_vendor_id, p_store_id, p_return_date, p_items, p_refund_amount, p_notes, p_created_by, p_payment_method);

  IF v_branch IS NOT NULL THEN
    UPDATE public.vendor_settlements SET branch_id = v_branch WHERE id = v_return;
  END IF;
  PERFORM public.set_inventory_branch(NULL);
  RETURN v_return;
END;
$$;

-- 4. Deleting a settlement: a return takes its goods back OUT of the shop's stock -
-- Same as 20260823000006 for a normal settlement. A return (negative receivable)
-- never touched the vendor's pool, so it must not put anything back into it.
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
  SELECT id, vendor_id, store_id, total_receivable INTO v_settlement
  FROM public.vendor_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement % not found', p_settlement_id;
  END IF;

  IF v_settlement.store_id IS DISTINCT FROM p_caller_store_id THEN
    RAISE EXCEPTION 'Settlement % does not belong to store %', p_settlement_id, p_caller_store_id;
  END IF;

  -- A return after sale: take the returned goods back out of the shop's stock.
  IF v_settlement.total_receivable < 0 THEN
    FOR v_item IN
      SELECT product_id, variant_id, returned_quantity
      FROM public.vendor_settlement_items
      WHERE settlement_id = p_settlement_id
      ORDER BY product_id, variant_id
    LOOP
      IF v_item.returned_quantity <= 0 THEN
        CONTINUE;
      END IF;

      SELECT quantity_available INTO v_prev_wh
      FROM public.product_inventory
      WHERE product_id = v_item.product_id
        AND variant_id IS NOT DISTINCT FROM v_item.variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No warehouse inventory row for product % / variant %', v_item.product_id, v_item.variant_id;
      END IF;

      IF v_prev_wh < v_item.returned_quantity THEN
        RAISE EXCEPTION 'Warehouse stock for product % is % but this return added % — that stock has already moved elsewhere, cannot reverse automatically', v_item.product_id, v_prev_wh, v_item.returned_quantity;
      END IF;

      v_new_wh := v_prev_wh - v_item.returned_quantity;

      UPDATE public.product_inventory
      SET quantity_available = v_new_wh, updated_at = now()
      WHERE product_id = v_item.product_id
        AND variant_id IS NOT DISTINCT FROM v_item.variant_id;

      INSERT INTO public.stock_movements
        (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
      VALUES
        (v_item.product_id, v_item.variant_id, -v_item.returned_quantity, v_prev_wh, v_new_wh, 'manual_adjustment', 'Deleted vendor return ' || p_settlement_id, p_deleted_by);
    END LOOP;

    DELETE FROM public.vendor_payments WHERE settlement_id = p_settlement_id;
    DELETE FROM public.vendor_settlement_items WHERE settlement_id = p_settlement_id;
    DELETE FROM public.vendor_settlements WHERE id = p_settlement_id;
    RETURN;
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

-- 5. Grants: server code only (service role), like the other vendor functions ---
GRANT ALL ON FUNCTION "public"."record_vendor_return"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying) TO "service_role";
REVOKE ALL ON FUNCTION "public"."record_vendor_return"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."record_vendor_return_at_branch"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying, "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."record_vendor_return_at_branch"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid", character varying, "uuid") TO "service_role";
