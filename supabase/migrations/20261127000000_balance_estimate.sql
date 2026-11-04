-- An ESTIMATED balance for a past day.
--
-- The database never recorded the balance sheet day by day, so a day before the balance history
-- (20261126) was switched on has no exact balance. Most of it can still be worked out from dated
-- records, as an estimate:
--   accounts_payable / supplier_advance  supplier bills, payments and credits up to the day (exact)
--   customer_due      orders up to the day less customer payments up to the day (orders cancelled
--                     or returned later are left out, so it can be a little low)
--   cod_pending       COD orders up to the day that are delivered now and not in a settlement dated
--                     on or before the day (an order delivered after the day is still counted, so it
--                     can be high: the delivery day is not recorded)
--   inventory_*       stock now, less every stock movement after the day, at today's cost and
--                     price (the cost on that day is not recorded)
--   vendor_due        vendors' unsettled stock (worked back the same way) + settlements + delivery
--                     charges up to the day, less vendor payments up to the day
-- Cash comes from the Money Book and Money Overview in the app (same day cut-off).
--
-- Read-only: a new function, no table changes. Same permission checks as get_balance_snapshot.
-- Requires 20261113000000_accrual_statements.sql and the vendor and branch tables.
CREATE OR REPLACE FUNCTION "public"."get_balance_estimate"(
    "p_store_id" "uuid",
    "p_branch_id" "uuid",
    "p_date" "date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  -- Midnight at the end of p_date in Dhaka: anything at or after this is "after the day".
  v_end timestamptz := ((p_date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka');
  v_inv_cost numeric := 0;
  v_inv_sell numeric := 0;
  v_units numeric := 0;
  v_no_cost integer := 0;
  v_due numeric := 0;
  v_cod numeric := 0;
  v_payable numeric := NULL;
  v_advance numeric := NULL;
  v_vendor numeric := 0;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  -- Inventory: stock now, less movements after the day.
  WITH moved AS (
    SELECT sm.product_id, sm.variant_id, SUM(sm.delta) AS after_delta
    FROM public.stock_movements sm
    JOIN public.products mp ON mp.id = sm.product_id AND mp.store_id = p_store_id
    WHERE sm.created_at >= v_end
      AND (p_branch_id IS NULL OR sm.branch_id = p_branch_id)
    GROUP BY sm.product_id, sm.variant_id
  ),
  lines AS (
    SELECT GREATEST(
             (CASE WHEN p_branch_id IS NULL THEN pi.quantity_available ELSE COALESCE(bi.quantity_available, 0) END)
             - COALESCE(mv.after_delta, 0), 0) AS qa,
           CASE WHEN pi.variant_id IS NOT NULL
                THEN COALESCE(NULLIF(v.discounted_price, 0), v.base_price)
                ELSE COALESCE(NULLIF(p.discounted_price, 0), p.base_price) END AS price,
           CASE WHEN pi.variant_id IS NOT NULL
                THEN COALESCE(v.tp_price, p.tp_price)
                ELSE p.tp_price END AS cost
    FROM public.products p
    JOIN public.product_inventory pi ON pi.product_id = p.id
    LEFT JOIN public.product_variants v ON v.id = pi.variant_id
    LEFT JOIN public.branch_inventory bi
      ON p_branch_id IS NOT NULL
     AND bi.branch_id = p_branch_id AND bi.product_id = p.id
     AND bi.variant_id IS NOT DISTINCT FROM pi.variant_id
    LEFT JOIN moved mv ON mv.product_id = p.id AND mv.variant_id IS NOT DISTINCT FROM pi.variant_id
    WHERE p.store_id = p_store_id
      AND pi.track_inventory IS NOT FALSE
      AND (
        (pi.variant_id IS NOT NULL AND v.is_active IS NOT FALSE)
        OR (pi.variant_id IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.product_variants v2 WHERE v2.product_id = p.id AND v2.is_active IS NOT FALSE))
      )
  )
  SELECT COALESCE(SUM(qa * COALESCE(cost, 0)), 0),
         COALESCE(SUM(qa * COALESCE(price, 0)), 0),
         COALESCE(SUM(qa), 0),
         COUNT(*) FILTER (WHERE qa > 0 AND COALESCE(cost, 0) = 0)
    INTO v_inv_cost, v_inv_sell, v_units, v_no_cost
  FROM lines;

  -- Customer dues: orders up to the day, less payments up to the day, per customer and branch.
  WITH open_orders AS (
    SELECT o.id, o.branch_id, o.customer_id, o.total_amount
    FROM public.orders o
    WHERE o.store_id = p_store_id
      AND o.customer_id IS NOT NULL
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND o.order_date <= p_date
      AND o.payment_status <> 'refunded'
      AND o.status NOT IN ('cancelled', 'returned')
      AND NOT (o.payment_method = 'cod' AND o.channel IS DISTINCT FROM 'pos')
      -- Not paid at the sale: unpaid now, or marked paid only after the day, or paid later out of the customer's payments.
      AND (
        o.payment_status <> 'paid'
        OR (o.paid_at IS NOT NULL AND o.paid_at >= v_end)
        OR public.is_ledger_settled_order(o.store_id, o.customer_id, o.payment_status, o.paid_at, o.created_at, o.updated_at)
      )
  )
  SELECT COALESCE(SUM(GREATEST(x.owed - x.paid, 0)), 0) INTO v_due
  FROM (
    SELECT oo.branch_id, oo.customer_id,
           SUM(oo.total_amount) AS owed,
           COALESCE((
             SELECT SUM(cp.amount) FROM public.customer_payments cp
             WHERE cp.store_id = p_store_id AND cp.customer_id = oo.customer_id
               AND cp.payment_date <= p_date
               AND (cp.order_id IN (SELECT id FROM open_orders
                                    WHERE branch_id IS NOT DISTINCT FROM oo.branch_id AND customer_id = oo.customer_id)
                    OR (cp.order_id IS NULL AND cp.branch_id IS NOT DISTINCT FROM oo.branch_id))
           ), 0) AS paid
    FROM open_orders oo
    GROUP BY oo.branch_id, oo.customer_id
  ) x;

  -- COD cash with couriers: delivered COD orders up to the day, not in a settlement on or before the day.
  SELECT COALESCE(SUM(o.total_amount), 0) INTO v_cod
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
    AND o.payment_method = 'cod' AND o.status = 'delivered' AND o.channel <> 'pos'
    AND o.order_date <= p_date
    AND (o.payment_status <> 'paid' OR (o.paid_at IS NOT NULL AND o.paid_at >= v_end))
    AND (
      o.cod_settlement_id IS NULL
      OR EXISTS (SELECT 1 FROM public.store_cod_settlements s WHERE s.id = o.cod_settlement_id AND s.settlement_date > p_date)
    );

  -- Supplier bills (store-wide, like the live balance): each supplier on its own, up to the day.
  IF public.has_store_permission(p_store_id, 'stock.supplier_money') THEN
    BEGIN
      SELECT COALESCE(SUM(GREATEST(s.bal, 0)), 0), COALESCE(SUM(GREATEST(-s.bal, 0)), 0)
        INTO v_payable, v_advance
      FROM (
        SELECT SUM(CASE WHEN kind = 'bill' THEN amount ELSE -amount END) AS bal
        FROM public.supplier_ledger
        WHERE store_id = p_store_id AND entry_date <= p_date
        GROUP BY supplier_id
      ) s;
    EXCEPTION WHEN undefined_table THEN
      v_payable := NULL;
      v_advance := NULL;
    END;
  END IF;

  -- What vendors owed (vendor-wide): their unsettled stock then + settlements + delivery charges, less payments, all up to the day.
  BEGIN
    SELECT
      COALESCE((
        SELECT SUM(GREATEST(vs.quantity_available - COALESCE(vm.after_delta, 0), 0) * COALESCE(vs.last_vendor_tp, 0))
        FROM public.vendor_stock vs
        LEFT JOIN (
          SELECT vendor_id, product_id, variant_id, SUM(delta) AS after_delta
          FROM public.vendor_stock_movements
          WHERE created_at >= v_end
          GROUP BY vendor_id, product_id, variant_id
        ) vm ON vm.vendor_id = vs.vendor_id AND vm.product_id = vs.product_id AND vm.variant_id IS NOT DISTINCT FROM vs.variant_id
        WHERE vs.store_id = p_store_id
      ), 0)
      + COALESCE((SELECT SUM(total_receivable) FROM public.vendor_settlements WHERE store_id = p_store_id AND settlement_date <= p_date), 0)
      + COALESCE((SELECT SUM(delivery_cost) FROM public.vendor_orders WHERE store_id = p_store_id AND status = 'confirmed' AND order_date <= p_date), 0)
      - COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE store_id = p_store_id AND payment_date <= p_date), 0)
    INTO v_vendor;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_vendor := 0;
  END;

  RETURN jsonb_build_object(
    'inventory_cost', v_inv_cost,
    'inventory_sell', v_inv_sell,
    'inventory_units', v_units,
    'items_without_cost', v_no_cost,
    'customer_due', v_due,
    'cod_pending', v_cod,
    'accounts_payable', v_payable,
    'supplier_advance', v_advance,
    'vendor_due', GREATEST(v_vendor, 0)
  );
END;
$$;
ALTER FUNCTION "public"."get_balance_estimate"("uuid", "uuid", "date") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_balance_estimate"("uuid", "uuid", "date") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_balance_estimate"("uuid", "uuid", "date") TO "authenticated";
