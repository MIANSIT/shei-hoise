-- Cancel ONE product line of a stock transfer instead of the whole transfer.
--   draft: the line is just removed (no stock has moved).
--   sent : that line's stock goes back to the source branch, then it is removed.
-- If it was the last line, the whole transfer is cancelled.
CREATE OR REPLACE FUNCTION "public"."cancel_branch_transfer_item"("p_item_id" "uuid", "p_caller_store_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  t record;
  i record;
  v_have integer;
  v_left integer;
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

  SELECT count(*) INTO v_left FROM public.branch_stock_transfer_items WHERE transfer_id = t.id;
  IF v_left = 0 THEN
    UPDATE public.branch_stock_transfers
       SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE id = t.id;
  ELSE
    UPDATE public.branch_stock_transfers SET updated_at = now() WHERE id = t.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION "public"."cancel_branch_transfer_item"("uuid", "uuid", "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."cancel_branch_transfer_item"("uuid", "uuid", "uuid") TO "service_role";
