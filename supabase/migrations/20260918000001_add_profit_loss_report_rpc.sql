-- A dedicated Profit & Loss report with its own arbitrary date range (not
-- tied to the main dashboard's weekly/monthly/yearly/all toggle). Reuses the
-- exact same rollup tables get_dashboard_summary already reads
-- (dashboard_daily_metrics, dashboard_daily_expense_category_summary) — both
-- already bucketed by orders.order_date as of
-- 20260918000000_dashboard_metrics_use_order_date.sql — so this inherits
-- that same correctness with no extra bucketing logic of its own.
--
-- cogs is derived as total_sales - gross_profit rather than computed with
-- its own query: dashboard_daily_metrics.gross_profit is built as
-- SUM(unit_price * shipping/discount-adjusted ratio * qty - cost * qty), and
-- that ratio exists specifically so the ratio-adjusted revenue side sums to
-- paid_revenue exactly — so paid_revenue - gross_profit already equals the
-- cost side (SUM(cost * qty)) with no separate aggregation needed.
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
  v_gross_profit numeric;
  v_total_expenses numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;

  SELECT COALESCE(SUM(paid_revenue), 0), COALESCE(SUM(gross_profit), 0)
    INTO v_total_sales, v_gross_profit
  FROM public.dashboard_daily_metrics
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.dashboard_daily_expense_category_summary
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

  SELECT jsonb_build_object(
    'total_sales', v_total_sales,
    'cogs', v_total_sales - v_gross_profit,
    'gross_profit', v_gross_profit,
    'total_expenses', v_total_expenses,
    'net_profit', v_gross_profit - v_total_expenses,
    -- Day-by-day net profit for the trend chart, gaps filled with zero (a
    -- day with no orders/expenses has no row in either rollup table at all).
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
