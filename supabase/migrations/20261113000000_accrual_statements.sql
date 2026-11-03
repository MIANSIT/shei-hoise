-- Profit & Loss on one basis, and a Balance snapshot.
--
-- Until now the dashboard's profit was worked out on PAID orders only, while
-- its Sales card counted every order, so the two never reconciled. These two
-- functions add the accrual view (the standard used by accountants):
--
--   Net revenue   every order that isn't cancelled or returned, paid or not:
--                 items − discount + extra charges (delivery and tax are not
--                 the shop's sales — same amount as the Sales Report)
--   COGS          cost of exactly those orders' items
--   Gross profit  Net revenue − COGS
--   Net profit    Gross profit − expenses − net delivery cost
--                 (vendor margin is added by the app, as before)
--
-- The unpaid part of revenue is not hidden: it is returned as `uncollected`
-- and shows on the Balance tab as Accounts receivable.
--
-- Additive: two new functions, no table or column changes, nothing existing is
-- replaced, so every current figure stays exactly as it is until the app
-- switches to these. Read live from orders (not the daily rollups), so no
-- backfill is needed.
--
-- Requires 20261020000000_pending_balance.sql and 20261003000000 (branches).

-- 1. Profit & Loss, accrual basis -------------------------------------------
CREATE OR REPLACE FUNCTION "public"."get_profit_loss_accrual"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_days jsonb;
  v_revenue numeric;
  v_collected numeric;
  v_orders integer;
  v_cogs numeric;
  v_delivery numeric;
  v_expenses numeric;
  v_trend jsonb;
BEGIN
  IF NOT (
    public.has_store_permission(p_store_id, 'dashboard.view')
    OR public.has_store_permission(p_store_id, 'reports.view')
  ) THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  -- One pass over the period's orders, summed per day.
  WITH ord AS (
    SELECT o.id,
           o.order_date AS d,
           COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0) AS rev,
           (o.payment_status = 'paid') AS is_paid,
           -- Courier cost minus what the customer was charged (negative = delivery earns money).
           COALESCE(lc.amount, o.shipping_fee, 0) - COALESCE(o.shipping_fee, 0) AS dnet,
           COALESCE((
             SELECT SUM(COALESCE(oi.cost_price, pv.tp_price, p2.tp_price, 0) * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
           ), 0) AS cost
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT odc.amount
      FROM public.order_delivery_costs odc
      WHERE odc.order_id = o.id
      ORDER BY odc.created_at DESC
      LIMIT 1
    ) lc ON true
    WHERE o.store_id = p_store_id
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND o.order_date BETWEEN p_period_start AND p_period_end
      AND o.status NOT IN ('cancelled', 'returned')
  ),
  day AS (
    SELECT d,
           SUM(rev) AS rev,
           SUM(rev) FILTER (WHERE is_paid) AS rev_paid,
           SUM(cost) AS cost,
           SUM(dnet) AS dnet,
           COUNT(*) AS n
    FROM ord GROUP BY d
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'd', d, 'rev', rev, 'rev_paid', COALESCE(rev_paid, 0), 'cost', cost, 'dnet', dnet, 'n', n)), '[]'::jsonb)
    INTO v_days
  FROM day;

  SELECT COALESCE(SUM(x.rev), 0), COALESCE(SUM(x.rev_paid), 0), COALESCE(SUM(x.n), 0),
         COALESCE(SUM(x.cost), 0), COALESCE(SUM(x.dnet), 0)
    INTO v_revenue, v_collected, v_orders, v_cogs, v_delivery
  FROM jsonb_to_recordset(v_days) AS x(d date, rev numeric, rev_paid numeric, cost numeric, dnet numeric, n integer);

  -- Expenses: same sources as the existing dashboard and report.
  IF p_branch_id IS NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM public.dashboard_daily_expense_category_summary
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM public.expenses
    WHERE store_id = p_store_id AND branch_id = p_branch_id
      AND expense_date BETWEEN p_period_start AND p_period_end;
  END IF;

  -- Daily net profit; its points add up to the headline net profit.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'date', g.day::date,
           'net_profit', COALESCE(t.rev, 0) - COALESCE(t.cost, 0) - COALESCE(t.dnet, 0) - COALESCE(e.amount, 0)
         ) ORDER BY g.day), '[]'::jsonb)
    INTO v_trend
  FROM generate_series(p_period_start, p_period_end, '1 day') AS g(day)
  LEFT JOIN jsonb_to_recordset(v_days) AS t(d date, rev numeric, rev_paid numeric, cost numeric, dnet numeric, n integer)
    ON t.d = g.day::date
  LEFT JOIN (
    SELECT es.day, SUM(es.amount) AS amount FROM (
      SELECT summary_date AS day, amount
      FROM public.dashboard_daily_expense_category_summary
      WHERE p_branch_id IS NULL AND store_id = p_store_id
        AND summary_date BETWEEN p_period_start AND p_period_end
      UNION ALL
      SELECT expense_date AS day, amount
      FROM public.expenses
      WHERE p_branch_id IS NOT NULL AND store_id = p_store_id AND branch_id = p_branch_id
        AND expense_date BETWEEN p_period_start AND p_period_end
    ) es GROUP BY es.day
  ) e ON e.day = g.day::date;

  RETURN jsonb_build_object(
    'net_revenue', v_revenue,
    'collected', v_collected,
    'uncollected', v_revenue - v_collected,
    'orders_count', v_orders,
    'cogs', v_cogs,
    'gross_profit', v_revenue - v_cogs,
    'total_expenses', v_expenses,
    'delivery_net_cost', v_delivery,
    'net_profit', v_revenue - v_cogs - v_expenses - v_delivery,
    'trend', v_trend
  );
END;
$$;
ALTER FUNCTION "public"."get_profit_loss_accrual"("uuid", "date", "date", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_profit_loss_accrual"("uuid", "date", "date", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_profit_loss_accrual"("uuid", "date", "date", "uuid") TO "authenticated";

-- 2. Balance snapshot (as of today) -----------------------------------------
--   inventory_cost    stock on hand at cost (tp_price); stock without a cost
--                     counts as 0 and is reported in items_without_cost
--   inventory_sell    the same stock at selling price
--   customer_due      customers owe the shop directly (after payments)
--   cod_pending       delivered COD the courier hasn't handed over
--   accounts_payable  supplier bills − supplier payments. Store-wide (bills
--                     have no branch). NULL when the caller lacks the
--                     stock.supplier_money permission or the ledger table
--                     isn't there yet.
-- Cash & bank is not here: it needs an opening balance (later phase).
CREATE OR REPLACE FUNCTION "public"."get_balance_snapshot"(
    "p_store_id" "uuid",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_inv_cost numeric := 0;
  v_inv_sell numeric := 0;
  v_units numeric := 0;
  v_no_cost integer := 0;
  v_payable numeric := NULL;
  v_pending jsonb;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  -- Same shelf rules as the dashboard's inventory figures.
  WITH lines AS (
    SELECT CASE WHEN p_branch_id IS NULL THEN pi.quantity_available
                ELSE COALESCE(bi.quantity_available, 0) END AS qa,
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
    WHERE p.store_id = p_store_id
      AND pi.track_inventory IS NOT FALSE
      AND (
        (pi.variant_id IS NOT NULL AND v.is_active IS NOT FALSE)
        OR (pi.variant_id IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.product_variants v2 WHERE v2.product_id = p.id AND v2.is_active IS NOT FALSE))
      )
  )
  SELECT COALESCE(SUM(GREATEST(qa, 0) * COALESCE(cost, 0)), 0),
         COALESCE(SUM(GREATEST(qa, 0) * COALESCE(price, 0)), 0),
         COALESCE(SUM(GREATEST(qa, 0)), 0),
         COUNT(*) FILTER (WHERE qa > 0 AND COALESCE(cost, 0) = 0)
    INTO v_inv_cost, v_inv_sell, v_units, v_no_cost
  FROM lines;

  IF public.has_store_permission(p_store_id, 'stock.supplier_money') THEN
    BEGIN
      SELECT COALESCE(SUM(CASE WHEN kind = 'bill' THEN amount ELSE -amount END), 0)
        INTO v_payable
      FROM public.supplier_ledger
      WHERE store_id = p_store_id;
    EXCEPTION WHEN undefined_table THEN
      v_payable := NULL;
    END;
  END IF;

  v_pending := public.get_pending_balance(p_store_id, p_branch_id);

  RETURN jsonb_build_object(
    'inventory_cost', v_inv_cost,
    'inventory_sell', v_inv_sell,
    'inventory_units', v_units,
    'items_without_cost', v_no_cost,
    'customer_due', COALESCE((v_pending ->> 'customer_due')::numeric, 0),
    'cod_pending', COALESCE((v_pending ->> 'cod_pending')::numeric, 0),
    'accounts_payable', v_payable
  );
END;
$$;
ALTER FUNCTION "public"."get_balance_snapshot"("uuid", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_balance_snapshot"("uuid", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_balance_snapshot"("uuid", "uuid") TO "authenticated";
