-- A dedicated Profit & Loss report with its own arbitrary date range (not
-- tied to the main dashboard's weekly/monthly/yearly/all toggle). Reuses the
-- exact same rollup tables get_dashboard_summary already reads
-- (dashboard_daily_metrics, dashboard_daily_expense_category_summary) — both
-- already bucketed by orders.order_date as of
-- 20260918000000_dashboard_metrics_use_order_date.sql — so this inherits
-- that same correctness with no extra bucketing logic of its own.
--
-- cogs is its OWN query (SUM(cost * qty) for paid orders' line items), not
-- derived as total_sales - gross_profit — an earlier version of this
-- function did that, but dashboard_daily_metrics.gross_profit also folds in
-- the delivery-cost variance (shipping_fee charged vs. what was actually
-- paid the courier, from order_delivery_costs), so "total_sales -
-- gross_profit" silently mixed delivery variance into what was labeled
-- "COGS". This version keeps cogs as pure product cost and surfaces that
-- delivery variance as its own delivery_net_cost figure instead, so nothing
-- is hidden inside the wrong line — net_profit still nets out to the exact
-- same bottom-line number either way, this only fixes how it's broken down.
CREATE OR REPLACE FUNCTION "public"."get_profit_loss_report"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
  v_total_sales numeric;
  v_cogs numeric;
  v_gross_profit numeric;
  v_total_expenses numeric;
  v_delivery_net_cost numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;

  -- Total Sales — product revenue only, excluding the shipping fee charged
  -- to the customer (a pass-through, not sales revenue), same as the rest
  -- of the dashboard.
  SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
  FROM public.dashboard_daily_metrics
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

  -- COGS — pure product cost of what was actually sold (paid orders only),
  -- independent of delivery/shipping entirely.
  SELECT COALESCE(SUM(
    COALESCE(oi.cost_price, pv.tp_price, p2.tp_price, 0) * oi.quantity
  ), 0) INTO v_cogs
  FROM public.order_items oi
  JOIN public.orders o2 ON o2.id = oi.order_id
  LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
  LEFT JOIN public.products p2 ON p2.id = oi.product_id
  WHERE o2.store_id = p_store_id
    AND o2.order_date BETWEEN p_period_start AND p_period_end
    AND o2.payment_status = 'paid';

  v_gross_profit := v_total_sales - v_cogs;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.dashboard_daily_expense_category_summary
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

  -- Delivery net cost — what was actually paid to the courier minus what
  -- was charged the customer for shipping (order_delivery_costs' most
  -- recent row per order; falls back to "assume it matched what was
  -- charged" when no actual cost has been recorded yet). Positive = a real
  -- cost eating into profit; negative = shipping charged covered more than
  -- the courier actually cost, i.e. extra income.
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
    AND o3.order_date BETWEEN p_period_start AND p_period_end
    AND o3.payment_status = 'paid';

  SELECT jsonb_build_object(
    'total_sales', v_total_sales,
    'cogs', v_cogs,
    'gross_profit', v_gross_profit,
    'total_expenses', v_total_expenses,
    'delivery_net_cost', v_delivery_net_cost,
    'net_profit', v_gross_profit - v_total_expenses - v_delivery_net_cost,
    -- Day-by-day net profit for the trend chart — unaffected by the
    -- cogs/gross_profit relabeling above, since dashboard_daily_metrics.
    -- gross_profit already nets in the same delivery variance per day
    -- (see recompute_dashboard_daily_metrics), so this sum still lands on
    -- the correct daily net profit. Gaps filled with zero (a day with no
    -- orders/expenses has no row in either rollup table at all).
    'trend', (
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
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."get_profit_loss_report"("uuid", "date", "date") OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_profit_loss_report"("uuid", "date", "date") TO "authenticated";
