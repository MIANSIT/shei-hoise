-- Editing a draft vendor order previously did an unlocked status read
-- followed by three separate, non-transactional calls (update order,
-- delete items, insert items) from the application. confirm_vendor_order
-- takes a real FOR UPDATE lock on the same vendor_orders row -- if one user
-- confirmed an order while another had the edit page open, the edit could
-- still go through on its now-stale status check, desyncing
-- vendor_order_items from what was actually dispatched with no error shown
-- to either user.
--
-- update_vendor_order_draft moves the whole operation into one function so
-- it locks the row, re-checks status inside that lock, and does everything
-- else in the same implicit transaction -- serializing correctly against
-- confirm_vendor_order.
--
-- p_items is a JSON array of {product_id, variant_id, product_name, sku,
-- quantity, original_tp, increase_percent, vendor_tp, mrp} -- the same
-- shape the client already builds for createVendorOrder/updateVendorOrder.

CREATE OR REPLACE FUNCTION "public"."update_vendor_order_draft"(
    "p_order_id" "uuid",
    "p_store_id" "uuid",
    "p_order_date" "date",
    "p_invoice_date" "date" DEFAULT NULL,
    "p_delivery_date" "date" DEFAULT NULL,
    "p_delivery_person" character varying DEFAULT NULL,
    "p_vehicle_number" character varying DEFAULT NULL,
    "p_reference_number" character varying DEFAULT NULL,
    "p_notes" "text" DEFAULT NULL,
    "p_delivery_cost" numeric DEFAULT 0,
    "p_discount_amount" numeric DEFAULT 0,
    "p_paid_amount" numeric DEFAULT 0,
    "p_items" "jsonb" DEFAULT '[]'::jsonb
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order record;
  v_item jsonb;
  v_total_quantity integer := 0;
  v_subtotal numeric(12,2) := 0;
  v_grand_total numeric(12,2);
  v_due_amount numeric(12,2);
  v_quantity integer;
  v_vendor_tp numeric(10,2);
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one product is required';
  END IF;

  SELECT id, status, store_id INTO v_order
  FROM public.vendor_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.store_id <> p_store_id THEN
    RAISE EXCEPTION 'Vendor order not found';
  END IF;

  IF v_order.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft orders can be edited';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    v_vendor_tp := (v_item->>'vendor_tp')::numeric;
    v_total_quantity := v_total_quantity + v_quantity;
    v_subtotal := v_subtotal + v_quantity * v_vendor_tp;
  END LOOP;

  v_grand_total := v_subtotal + p_delivery_cost - p_discount_amount;
  v_due_amount := v_grand_total - p_paid_amount;

  UPDATE public.vendor_orders
  SET order_date = p_order_date,
      invoice_date = p_invoice_date,
      delivery_date = p_delivery_date,
      delivery_person = p_delivery_person,
      vehicle_number = p_vehicle_number,
      reference_number = p_reference_number,
      notes = p_notes,
      total_quantity = v_total_quantity,
      subtotal = v_subtotal,
      delivery_cost = p_delivery_cost,
      discount_amount = p_discount_amount,
      grand_total = v_grand_total,
      paid_amount = p_paid_amount,
      due_amount = v_due_amount,
      updated_at = now()
  WHERE id = p_order_id;

  DELETE FROM public.vendor_order_items WHERE vendor_order_id = p_order_id;

  INSERT INTO public.vendor_order_items
    (vendor_order_id, product_id, variant_id, product_name, sku, quantity,
     original_tp, increase_percent, vendor_tp, mrp, line_total)
  SELECT
    p_order_id,
    (item->>'product_id')::uuid,
    NULLIF(item->>'variant_id', '')::uuid,
    item->>'product_name',
    item->>'sku',
    (item->>'quantity')::integer,
    (item->>'original_tp')::numeric,
    COALESCE((item->>'increase_percent')::numeric, 0),
    (item->>'vendor_tp')::numeric,
    NULLIF(item->>'mrp', '')::numeric,
    (item->>'quantity')::integer * (item->>'vendor_tp')::numeric
  FROM jsonb_array_elements(p_items) AS item;
END;
$$;

ALTER FUNCTION "public"."update_vendor_order_draft"(
  "uuid", "uuid", "date", "date", "date", character varying, character varying,
  character varying, "text", numeric, numeric, numeric, "jsonb"
) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."update_vendor_order_draft"(
  "uuid", "uuid", "date", "date", "date", character varying, character varying,
  character varying, "text", numeric, numeric, numeric, "jsonb"
) TO "service_role";
