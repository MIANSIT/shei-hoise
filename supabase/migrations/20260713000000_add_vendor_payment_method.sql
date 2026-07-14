-- Adds a payment_method column to vendor_payments so the owner can record
-- *how* cash was collected from a vendor (COD, cash-in-hand, bKash/Nagad
-- under "mobile_banking", bank transfer, card) -- not just the amount.
-- Reuses the same value set as the existing public.orders payment_method
-- column (see src/lib/types/enums.ts PaymentMethod) rather than inventing a
-- new one, so the concept stays consistent across the app.
--
-- record_vendor_settlement gets a new trailing p_payment_method parameter.
-- CREATE OR REPLACE FUNCTION cannot change a function's argument list --
-- doing so creates a second, overloaded function instead of replacing the
-- original, which then makes PostgREST's RPC resolution ambiguous. The old
-- 7-argument signature is dropped explicitly first so only the new
-- 8-argument version exists afterward.

ALTER TABLE "public"."vendor_payments"
  ADD COLUMN IF NOT EXISTS "payment_method" character varying(30) DEFAULT 'cash' NOT NULL;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."vendor_payments"
    ADD CONSTRAINT "vendor_payments_payment_method_check"
    CHECK (("payment_method")::"text" = ANY (ARRAY['cod'::"text", 'cash'::"text", 'online'::"text", 'card'::"text", 'bank_transfer'::"text", 'mobile_banking'::"text"]));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DROP FUNCTION IF EXISTS "public"."record_vendor_settlement"("uuid", "uuid", "date", "jsonb", numeric, "text", "uuid");

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
