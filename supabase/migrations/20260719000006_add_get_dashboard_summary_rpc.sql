-- Single read entry point for the dashboard. SECURITY DEFINER: checks the
-- caller owns p_store_id itself (auth.uid() -> public.users.store_id), then
-- reads the five summary tables, which carry no anon/authenticated policies
-- of their own — this function is the only door in. Mirrors the existing
-- find_customer_login_info precedent for a browser-called RPC in this schema.
--
-- Field scoping intentionally matches the client hook it replaces exactly:
-- revenue/order-count/AOV/profit/expenses are scoped to [p_period_start,
-- p_period_end] vs. the previous period; order_status_counts, payment_
-- amounts, top_products, and the customer snapshot are ALL-TIME (the old
-- hook computed these from the full fetched order history regardless of
-- the selected time period — same "All-time" labels already shown on the
-- Order Pipeline / Payment Flow cards). sales_trend is always the trailing
-- 30 real calendar days, independent of the period filter, same as before.
CREATE OR REPLACE FUNCTION "public"."get_dashboard_summary"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date",
    "p_prev_period_start" "date",
    "p_prev_period_end" "date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;

  SELECT jsonb_build_object(
    'revenue', COALESCE((SELECT SUM(paid_revenue) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_revenue', COALESCE((SELECT SUM(paid_revenue) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'order_count', COALESCE((SELECT SUM(orders_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_order_count', COALESCE((SELECT SUM(orders_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'order_value_sum', COALESCE((SELECT SUM(order_value_sum) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_order_value_sum', COALESCE((SELECT SUM(order_value_sum) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'paid_orders_count', COALESCE((SELECT SUM(paid_orders_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    -- Period-scoped (unlike payment_amounts below, which is all-time) —
    -- drives the "pending payments awaiting confirmation" alert, which the
    -- old hook computed only over the selected period's orders.
    'pending_payment_order_count', COALESCE((SELECT SUM(payment_pending_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'gross_profit', COALESCE((SELECT SUM(gross_profit) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_gross_profit', COALESCE((SELECT SUM(gross_profit) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),

    'order_status_counts', (
      SELECT jsonb_build_object(
        'pending', COALESCE(SUM(status_pending), 0),
        'confirmed', COALESCE(SUM(status_confirmed), 0),
        'shipped', COALESCE(SUM(status_shipped), 0),
        'delivered', COALESCE(SUM(status_delivered), 0),
        'cancelled', COALESCE(SUM(status_cancelled), 0)
      ) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id
    ),
    'payment_amounts', (
      SELECT jsonb_build_object(
        'pending', COALESCE(SUM(payment_pending_amount), 0),
        'paid', COALESCE(SUM(payment_paid_amount), 0),
        'refunded', COALESCE(SUM(payment_refunded_amount), 0)
      ) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id
    ),

    'sales_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d.day, 'sales', COALESCE(m.paid_revenue, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(v_today - INTERVAL '29 days', v_today, '1 day') AS d(day)
      LEFT JOIN public.dashboard_daily_metrics m ON m.store_id = p_store_id AND m.summary_date = d.day::date
    ),

    -- All-time, not period-scoped — matches topProductsMap in the old hook,
    -- which was populated from every paid order in the fetched history.
    'top_products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', product_name, 'revenue', total_revenue, 'quantity', total_qty)), '[]'::jsonb)
      FROM (
        SELECT product_name, SUM(revenue) AS total_revenue, SUM(quantity) AS total_qty
        FROM public.dashboard_daily_product_summary
        WHERE store_id = p_store_id
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 3
      ) top
    ),

    -- All-time except new_customers, matching the old hook's customerMap
    -- (built from full order history) with only the "first order in period" filter applied.
    'customer_snapshot', jsonb_build_object(
      'new_customers', COALESCE((
        SELECT COUNT(*) FROM public.dashboard_customer_summary
        WHERE store_id = p_store_id AND first_order_date BETWEEN p_period_start AND p_period_end
      ), 0),
      'returning_rate', COALESCE((
        SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE total_orders > 1) / NULLIF(COUNT(*), 0), 1)
        FROM public.dashboard_customer_summary WHERE store_id = p_store_id
      ), 0),
      'top_customer', COALESCE((
        SELECT jsonb_build_object('name', COALESCE(sc.name, 'Unknown'), 'total_spent', dcs.paid_total_spent)
        FROM public.dashboard_customer_summary dcs
        JOIN public.store_customers sc ON sc.id = dcs.customer_id
        WHERE dcs.store_id = p_store_id
        ORDER BY dcs.paid_total_spent DESC
        LIMIT 1
      ), jsonb_build_object('name', 'No customers', 'total_spent', 0))
    ),

    'inventory', COALESCE((
      SELECT jsonb_build_object(
        'in_stock_units', in_stock_units,
        'low_stock_product_count', low_stock_product_count,
        'out_of_stock_product_count', out_of_stock_product_count,
        'partially_out_of_stock_product_count', partially_out_of_stock_product_count,
        'total_inventory_value', total_inventory_value
      ) FROM public.dashboard_inventory_summary WHERE store_id = p_store_id
    ), jsonb_build_object(
      'in_stock_units', 0, 'low_stock_product_count', 0, 'out_of_stock_product_count', 0,
      'partially_out_of_stock_product_count', 0, 'total_inventory_value', 0
    )),

    'expense_metrics', jsonb_build_object(
      'total_expenses', COALESCE((SELECT SUM(amount) FROM public.dashboard_daily_expense_category_summary WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
      'prev_total_expenses', COALESCE((SELECT SUM(amount) FROM public.dashboard_daily_expense_category_summary WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
      'expense_count', COALESCE((SELECT SUM(expense_count) FROM public.dashboard_daily_expense_category_summary WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
      'top_expense_category', COALESCE((
        SELECT jsonb_build_object('name', COALESCE(ec.name, 'Uncategorized'), 'amount', cat.amount)
        FROM (
          SELECT category_id, SUM(amount) AS amount FROM public.dashboard_daily_expense_category_summary
          WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end
          GROUP BY category_id ORDER BY amount DESC LIMIT 1
        ) cat
        LEFT JOIN public.expense_categories ec ON ec.id = cat.category_id
      ), jsonb_build_object('name', 'None', 'amount', 0)),
      'expense_category_breakdown', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(ec.name, 'Uncategorized'), 'amount', cat.amount) ORDER BY cat.amount DESC), '[]'::jsonb)
        FROM (
          SELECT category_id, SUM(amount) AS amount FROM public.dashboard_daily_expense_category_summary
          WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end
          GROUP BY category_id ORDER BY amount DESC LIMIT 5
        ) cat
        LEFT JOIN public.expense_categories ec ON ec.id = cat.category_id
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date") OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date") TO "authenticated";
