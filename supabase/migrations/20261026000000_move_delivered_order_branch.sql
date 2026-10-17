-- Let a delivered order (e.g. a Quick Sale, which is created delivered) be
-- moved to another branch. Its stock has already left the old branch, so
-- instead of shifting a reservation the units go back to the old branch and
-- come out of the new one. Pending/confirmed orders behave exactly as before.
CREATE OR REPLACE FUNCTION "public"."move_order_to_branch"("p_order_id" "uuid", "p_branch_id" "uuid", "p_caller_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  o record;
  i record;
  v_have integer;
  v_delivered boolean;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id AND store_id = p_caller_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF o.status NOT IN ('pending', 'confirmed', 'delivered') THEN
    RAISE EXCEPTION 'Only pending, confirmed or delivered orders can move to another branch';
  END IF;
  v_delivered := (o.status = 'delivered');
  IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = p_branch_id AND store_id = p_caller_store_id AND is_active) THEN
    RAISE EXCEPTION 'Choose an active branch';
  END IF;

  IF o.branch_id IS NOT DISTINCT FROM p_branch_id THEN
    UPDATE public.orders SET branch_confirmed = true, updated_at = now() WHERE id = o.id;
    RETURN;
  END IF;

  -- Check first, so a shortfall leaves everything untouched.
  FOR i IN
    SELECT oi.product_id, oi.variant_id, SUM(oi.quantity)::int AS qty, MAX(oi.product_name) AS name
    FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = o.id AND p.product_type <> 'bundle'
    GROUP BY oi.product_id, oi.variant_id
  LOOP
    SELECT quantity_available INTO v_have FROM public.branch_inventory
     WHERE branch_id = p_branch_id AND product_id = i.product_id AND variant_id IS NOT DISTINCT FROM i.variant_id
     FOR UPDATE;
    IF COALESCE(v_have, 0) < i.qty THEN
      RAISE EXCEPTION 'Not enough % in that branch (has %, order needs %)', COALESCE(i.name, 'stock'), COALESCE(v_have, 0), i.qty;
    END IF;
  END LOOP;

  FOR i IN
    SELECT oi.product_id, oi.variant_id, SUM(oi.quantity)::int AS qty
    FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = o.id AND p.product_type <> 'bundle'
    GROUP BY oi.product_id, oi.variant_id
  LOOP
    IF v_delivered THEN
      -- put the sold units back in the old branch, take them from the new one
      PERFORM public.stock_move(o.store_id, o.branch_id, i.product_id, i.variant_id, 'take', -i.qty);
      PERFORM public.stock_move(o.store_id, p_branch_id, i.product_id, i.variant_id, 'take', i.qty);
    ELSE
      -- release from the old branch (or the store total for an order without one) …
      PERFORM public.stock_move(o.store_id, o.branch_id, i.product_id, i.variant_id, 'reserve', -i.qty);
      -- … and hold it in the new one
      PERFORM public.stock_move(o.store_id, p_branch_id, i.product_id, i.variant_id, 'reserve', i.qty);
    END IF;
  END LOOP;

  UPDATE public.orders
     SET branch_id = p_branch_id, branch_confirmed = true, needs_transfer = false, updated_at = now()
   WHERE id = o.id;
END;
$$;
