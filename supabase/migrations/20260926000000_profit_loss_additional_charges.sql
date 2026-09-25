-- Profit & Loss: report additional_charges (packaging/handling/etc. charged
-- to the customer) as its own figure. It was already inside total_sales
-- (paid_revenue = total_amount - shipping_fee, and total_amount includes
-- additional_charges) but invisible there. Same paid/non-cancelled rule as
-- every other figure in this report. Only a new key is added to the result,
-- so code that doesn't read it yet is unaffected.
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
  v_additional_charges numeric;
  v_cogs numeric;
  v_gross_profit numeric;
  v_total_expenses numeric;
  v_delivery_net_cost numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;

  SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
  FROM public.dashboard_daily_metrics
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

  SELECT COALESCE(SUM(o.additional_charges), 0) INTO v_additional_charges
  FROM public.orders o
  WHERE o.store_id = p_store_id
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
    AND o2.order_date BETWEEN p_period_start AND p_period_end
    AND o2.payment_status = 'paid'
    AND o2.status NOT IN ('cancelled', 'returned');

  v_gross_profit := v_total_sales - v_cogs;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.dashboard_daily_expense_category_summary
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

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
    AND o3.payment_status = 'paid'
    AND o3.status NOT IN ('cancelled', 'returned');

  SELECT jsonb_build_object(
    'total_sales', v_total_sales,
    'additional_charges', v_additional_charges,
    'cogs', v_cogs,
    'gross_profit', v_gross_profit,
    'total_expenses', v_total_expenses,
    'delivery_net_cost', v_delivery_net_cost,
    'net_profit', v_gross_profit - v_total_expenses - v_delivery_net_cost,
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
