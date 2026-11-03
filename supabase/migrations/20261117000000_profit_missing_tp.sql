-- Profit & Loss: a product with no TP is no longer silently counted as free.
--
-- get_profit_loss_accrual (20261113) took a missing or 0 cost as 0, so a sale
-- of a product with no TP showed as 100% profit and inflated the margin. This
-- replaces that one function with the same arguments and the same numbers,
-- except that:
--   * a cost saved as 0 on the order line falls back to the variant / product TP
--     (the Cash Register already does this);
--   * it also returns missing_cost_lines and missing_cost_sales: how many order
--     lines had no TP anywhere and what they sold for, so the app can warn and
--     show the margin on the lines that do have a TP.
-- Net revenue, COGS and net profit are otherwise unchanged. Additive: old code
-- ignores the two new keys.
--
-- Requires 20261113000000_accrual_statements.sql.

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
  v_miss_n integer;
  v_miss_sales numeric;
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
             SELECT SUM(COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0), 0) * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
           ), 0) AS cost,
           -- Lines sold with no cost anywhere (cost saved on the line, variant TP, product TP all empty or 0).
           COALESCE((
             SELECT COUNT(*)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
               AND COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0)) IS NULL
           ), 0) AS miss_n,
           COALESCE((
             SELECT SUM(oi.unit_price * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
               AND COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0)) IS NULL
           ), 0) AS miss_sales
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
           SUM(miss_n) AS miss_n,
           SUM(miss_sales) AS miss_sales,
           COUNT(*) AS n
    FROM ord GROUP BY d
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'd', d, 'rev', rev, 'rev_paid', COALESCE(rev_paid, 0), 'cost', cost, 'dnet', dnet, 'n', n,
           'miss_n', miss_n, 'miss_sales', miss_sales)), '[]'::jsonb)
    INTO v_days
  FROM day;

  SELECT COALESCE(SUM(x.rev), 0), COALESCE(SUM(x.rev_paid), 0), COALESCE(SUM(x.n), 0),
         COALESCE(SUM(x.cost), 0), COALESCE(SUM(x.dnet), 0),
         COALESCE(SUM(x.miss_n), 0), COALESCE(SUM(x.miss_sales), 0)
    INTO v_revenue, v_collected, v_orders, v_cogs, v_delivery, v_miss_n, v_miss_sales
  FROM jsonb_to_recordset(v_days) AS x(d date, rev numeric, rev_paid numeric, cost numeric, dnet numeric, n integer, miss_n integer, miss_sales numeric);

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
  LEFT JOIN jsonb_to_recordset(v_days) AS t(d date, rev numeric, rev_paid numeric, cost numeric, dnet numeric, n integer, miss_n integer, miss_sales numeric)
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
    'missing_cost_lines', v_miss_n,
    'missing_cost_sales', v_miss_sales,
    'trend', v_trend
  );
END;
$$;
ALTER FUNCTION "public"."get_profit_loss_accrual"("uuid", "date", "date", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_profit_loss_accrual"("uuid", "date", "date", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_profit_loss_accrual"("uuid", "date", "date", "uuid") TO "authenticated";
