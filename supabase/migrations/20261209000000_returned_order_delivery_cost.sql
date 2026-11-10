-- A courier charge recorded on a RETURNED order now counts as a delivery loss in profit.
--
-- Before: returned orders were left out of profit completely, so what the courier charged for a parcel that came
-- back was invisible. Now the actual delivery cost recorded on a returned order is taken out of profit. Nothing is
-- counted when no cost is recorded (leave it empty when the customer paid the courier). A returned order still
-- adds no sales, no product cost and is not counted as an order.
--
-- Changes two functions (full copies of their latest versions, plus this one rule):
--   get_profit_loss_accrual (Sales tab, Profit story)  and  get_profit_loss_report (Profit & Loss report).
-- No tables or columns change. Safe to run again.

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
           -- A returned order sold nothing: only the courier charge recorded on it counts (as a loss).
           CASE WHEN o.status = 'returned' THEN 0
                ELSE COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0) END AS rev,
           (o.status <> 'returned')::int AS cnt,
           (o.payment_status = 'paid') AS is_paid,
           -- Courier cost minus what the customer was charged (negative = delivery earns money).
           CASE WHEN o.status = 'returned' THEN COALESCE(lc.amount, 0)
                ELSE COALESCE(lc.amount, o.shipping_fee, 0) - COALESCE(o.shipping_fee, 0) END AS dnet,
           CASE WHEN o.status = 'returned' THEN 0 ELSE COALESCE((
             SELECT SUM(COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0), 0) * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
           ), 0) END AS cost,
           -- Lines sold with no cost anywhere (cost saved on the line, variant TP, product TP all empty or 0).
           CASE WHEN o.status = 'returned' THEN 0 ELSE COALESCE((
             SELECT COUNT(*)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
               AND COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0)) IS NULL
           ), 0) END AS miss_n,
           CASE WHEN o.status = 'returned' THEN 0 ELSE COALESCE((
             SELECT SUM(oi.unit_price * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
               AND COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0)) IS NULL
           ), 0) END AS miss_sales
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
      AND o.status <> 'cancelled'
  ),
  day AS (
    SELECT d,
           SUM(rev) AS rev,
           SUM(rev) FILTER (WHERE is_paid) AS rev_paid,
           SUM(cost) AS cost,
           SUM(dnet) AS dnet,
           SUM(miss_n) AS miss_n,
           SUM(miss_sales) AS miss_sales,
           SUM(cnt) AS n
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
    WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id
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
      WHERE paid_from IS DISTINCT FROM 'outside' AND p_branch_id IS NOT NULL AND store_id = p_store_id AND branch_id = p_branch_id
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

CREATE OR REPLACE FUNCTION "public"."get_profit_loss_report"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
  v_total_sales numeric;
  v_additional_charges numeric;
  v_cogs numeric;
  v_gross_profit numeric;
  v_total_expenses numeric;
  v_delivery_net_cost numeric;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'reports.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  IF p_branch_id IS NULL THEN
    SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
    FROM public.dashboard_daily_metrics
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM public.dashboard_daily_expense_category_summary
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;
  ELSE
    SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
    FROM public.dashboard_branch_daily_metrics
    WHERE store_id = p_store_id AND branch_id = p_branch_id AND summary_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM public.expenses
    WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id AND expense_date BETWEEN p_period_start AND p_period_end;
  END IF;

  SELECT COALESCE(SUM(o.additional_charges), 0) INTO v_additional_charges
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
    AND o.order_date BETWEEN p_period_start AND p_period_end
    AND o.payment_status = 'paid'
    AND o.status NOT IN ('cancelled', 'returned');

  SELECT COALESCE(SUM(
    COALESCE(oi.cost_price, pv.tp_price, p2.tp_price, 0) * oi.quantity
  ), 0) INTO v_cogs
  FROM public.order_items oi
  JOIN public.orders o2 ON o2.id = oi.order_id
  LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
  LEFT JOIN public.products p2 ON p2.id = oi.product_id
  WHERE o2.store_id = p_store_id
    AND (p_branch_id IS NULL OR o2.branch_id = p_branch_id)
    AND o2.order_date BETWEEN p_period_start AND p_period_end
    AND o2.payment_status = 'paid'
    AND o2.status NOT IN ('cancelled', 'returned');

  v_gross_profit := v_total_sales - v_cogs;

  SELECT COALESCE(SUM(COALESCE(latest_cost.amount, o3.shipping_fee) - o3.shipping_fee), 0)
    INTO v_delivery_net_cost
  FROM public.orders o3
  LEFT JOIN LATERAL (
    SELECT odc.amount
    FROM public.order_delivery_costs odc
    WHERE odc.order_id = o3.id
    ORDER BY odc.created_at DESC
    LIMIT 1
  ) latest_cost ON true
  WHERE o3.store_id = p_store_id
    AND (p_branch_id IS NULL OR o3.branch_id = p_branch_id)
    AND o3.order_date BETWEEN p_period_start AND p_period_end
    AND o3.payment_status = 'paid'
    AND o3.status NOT IN ('cancelled', 'returned');

  -- Courier charges recorded on returned orders (nothing was sold, so only the charge you paid counts).
  v_delivery_net_cost := v_delivery_net_cost + COALESCE((
    SELECT SUM(lc.amount)
    FROM public.orders o4
    JOIN LATERAL (
      SELECT odc.amount
      FROM public.order_delivery_costs odc
      WHERE odc.order_id = o4.id
      ORDER BY odc.created_at DESC
      LIMIT 1
    ) lc ON true
    WHERE o4.store_id = p_store_id
      AND (p_branch_id IS NULL OR o4.branch_id = p_branch_id)
      AND o4.order_date BETWEEN p_period_start AND p_period_end
      AND o4.status = 'returned'
  ), 0);

  SELECT jsonb_build_object(
    'total_sales', v_total_sales,
    'additional_charges', v_additional_charges,
    'cogs', v_cogs,
    'gross_profit', v_gross_profit,
    'total_expenses', v_total_expenses,
    'delivery_net_cost', v_delivery_net_cost,
    'net_profit', v_gross_profit - v_total_expenses - v_delivery_net_cost,
    'trend', CASE WHEN p_branch_id IS NULL THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', d.day,
        'net_profit', COALESCE(m.gross_profit, 0) - COALESCE(e.amount, 0)
      ) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(p_period_start, p_period_end, '1 day') AS d(day)
      LEFT JOIN public.dashboard_daily_metrics m
        ON m.store_id = p_store_id AND m.summary_date = d.day::date
      LEFT JOIN (
        SELECT summary_date, SUM(amount) AS amount
        FROM public.dashboard_daily_expense_category_summary
        WHERE store_id = p_store_id
        GROUP BY summary_date
      ) e ON e.summary_date = d.day::date
    ) ELSE (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', d.day,
        'net_profit', COALESCE(m.gross_profit, 0) - COALESCE(e.amount, 0)
      ) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(p_period_start, p_period_end, '1 day') AS d(day)
      LEFT JOIN public.dashboard_branch_daily_metrics m
        ON m.store_id = p_store_id AND m.branch_id = p_branch_id AND m.summary_date = d.day::date
      LEFT JOIN (
        SELECT expense_date, SUM(amount) AS amount
        FROM public.expenses
        WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id
          AND expense_date BETWEEN p_period_start AND p_period_end
        GROUP BY expense_date
      ) e ON e.expense_date = d.day::date
    ) END
  ) INTO v_result;

  RETURN v_result;
END;
$$;
