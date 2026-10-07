-- Receive a stock transfer PRODUCT BY PRODUCT.
-- Each transfer line gets a received_at. Receiving some lines puts just those
-- into the target branch; the transfer stays "sent" until every line is
-- received (then it becomes "received"). Cancelling only returns the lines
-- that haven't been received yet.

ALTER TABLE "public"."branch_stock_transfer_items" ADD COLUMN IF NOT EXISTS "received_at" timestamp with time zone;

-- Lines of transfers already received before this migration.
UPDATE "public"."branch_stock_transfer_items" i
   SET received_at = t.received_at
  FROM "public"."branch_stock_transfers" t
 WHERE t.id = i.transfer_id AND t.status = 'received' AND i.received_at IS NULL;

CREATE OR REPLACE FUNCTION "public"."receive_branch_transfer_items"("p_transfer_id" "uuid", "p_item_ids" "uuid"[], "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
  v_done integer := 0;
  v_pending integer;
BEGIN
  SELECT * INTO t FROM public.branch_stock_transfers
   WHERE id = p_transfer_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF t.status <> 'sent' THEN
    RAISE EXCEPTION 'Only a sent transfer can be received';
  END IF;

  FOR i IN
    SELECT * FROM public.branch_stock_transfer_items
     WHERE transfer_id = t.id AND id = ANY(p_item_ids) AND received_at IS NULL
  LOOP
    SELECT quantity_available INTO v_have FROM public.branch_inventory
     WHERE branch_id = t.to_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
     FOR UPDATE;
    PERFORM public.branch_inventory_add(t.store_id, t.to_branch_id, i.product_id, i.variant_id, i.quantity, 0);
    INSERT INTO public.stock_movements
      (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (i.product_id, i.variant_id, t.to_branch_id, i.quantity, COALESCE(v_have, 0), COALESCE(v_have, 0) + i.quantity, 'transfer_in', t.transfer_number, p_user_id);
    UPDATE public.branch_stock_transfer_items SET received_at = now() WHERE id = i.id;
    v_done := v_done + 1;
  END LOOP;

  IF v_done = 0 THEN
    RAISE EXCEPTION 'Nothing to receive';
  END IF;

  SELECT count(*) INTO v_pending FROM public.branch_stock_transfer_items
   WHERE transfer_id = t.id AND received_at IS NULL;
  IF v_pending = 0 THEN
    UPDATE public.branch_stock_transfers
       SET status = 'received', received_at = now(), received_by = p_user_id, updated_at = now()
     WHERE id = t.id;
  ELSE
    UPDATE public.branch_stock_transfers SET updated_at = now() WHERE id = t.id;
  END IF;
END;
$$;

-- Receiving the whole transfer = receiving every line still pending.
CREATE OR REPLACE FUNCTION "public"."receive_branch_transfer"("p_transfer_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.receive_branch_transfer_items(
    p_transfer_id,
    ARRAY(SELECT id FROM public.branch_stock_transfer_items WHERE transfer_id = p_transfer_id AND received_at IS NULL),
    p_caller_store_id,
    p_user_id
  );
END;
$$;

-- Cancelling a sent transfer returns only the lines not received yet. If some
-- were already received, the transfer ends as "received" with just those lines.
CREATE OR REPLACE FUNCTION "public"."cancel_branch_transfer"("p_transfer_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
  v_received integer;
BEGIN
  SELECT * INTO t FROM public.branch_stock_transfers
   WHERE id = p_transfer_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF t.status NOT IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'This transfer can no longer be cancelled';
  END IF;

  IF t.status = 'sent' THEN
    FOR i IN SELECT * FROM public.branch_stock_transfer_items WHERE transfer_id = t.id AND received_at IS NULL LOOP
      SELECT quantity_available INTO v_have FROM public.branch_inventory
       WHERE branch_id = t.from_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
       FOR UPDATE;
      PERFORM public.branch_inventory_add(t.store_id, t.from_branch_id, i.product_id, i.variant_id, i.quantity, 0);
      INSERT INTO public.stock_movements
        (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
      VALUES
        (i.product_id, i.variant_id, t.from_branch_id, i.quantity, COALESCE(v_have, 0), COALESCE(v_have, 0) + i.quantity, 'transfer_cancel', t.transfer_number, p_user_id);
    END LOOP;
  END IF;

  SELECT count(*) INTO v_received FROM public.branch_stock_transfer_items
   WHERE transfer_id = t.id AND received_at IS NOT NULL;
  IF v_received > 0 THEN
    DELETE FROM public.branch_stock_transfer_items WHERE transfer_id = t.id AND received_at IS NULL;
    UPDATE public.branch_stock_transfers
       SET status = 'received', received_at = now(), received_by = p_user_id, updated_at = now()
     WHERE id = t.id;
  ELSE
    UPDATE public.branch_stock_transfers
       SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE id = t.id;
  END IF;
END;
$$;

-- Cancel one line. A line already received can't be cancelled.
CREATE OR REPLACE FUNCTION "public"."cancel_branch_transfer_item"("p_item_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
  v_total integer;
  v_pending integer;
BEGIN
  SELECT * INTO i FROM public.branch_stock_transfer_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer item not found';
  END IF;

  SELECT * INTO t FROM public.branch_stock_transfers
   WHERE id = i.transfer_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF t.status NOT IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'This transfer can no longer be changed';
  END IF;
  IF i.received_at IS NOT NULL THEN
    RAISE EXCEPTION 'This product was already received';
  END IF;

  IF t.status = 'sent' THEN
    SELECT quantity_available INTO v_have FROM public.branch_inventory
     WHERE branch_id = t.from_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
     FOR UPDATE;
    PERFORM public.branch_inventory_add(t.store_id, t.from_branch_id, i.product_id, i.variant_id, i.quantity, 0);
    INSERT INTO public.stock_movements
      (product_id, variant_id, branch_id, delta, previous_quantity, new_quantity, reason, note, created_by)
    VALUES
      (i.product_id, i.variant_id, t.from_branch_id, i.quantity, COALESCE(v_have, 0), COALESCE(v_have, 0) + i.quantity, 'transfer_cancel', t.transfer_number, p_user_id);
  END IF;

  DELETE FROM public.branch_stock_transfer_items WHERE id = i.id;

  SELECT count(*), count(*) FILTER (WHERE received_at IS NULL) INTO v_total, v_pending
    FROM public.branch_stock_transfer_items WHERE transfer_id = t.id;
  IF v_total = 0 THEN
    UPDATE public.branch_stock_transfers
       SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE id = t.id;
  ELSIF v_pending = 0 THEN
    -- Everything left was already received.
    UPDATE public.branch_stock_transfers
       SET status = 'received', received_at = now(), received_by = p_user_id, updated_at = now()
     WHERE id = t.id;
  ELSE
    UPDATE public.branch_stock_transfers SET updated_at = now() WHERE id = t.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION "public"."receive_branch_transfer_items"("uuid", "uuid"[], "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."receive_branch_transfer_items"("uuid", "uuid"[], "uuid", "uuid") TO "service_role";
