-- Adds a "returned" order status, distinct from "cancelled" (never
-- fulfilled): the customer received a delivered order and sent it back.
-- Needed because delivered orders have no correct reversal path today —
-- deductReservedStock permanently removes stock from quantity_reserved
-- without ever adding it to quantity_available, and the dashboard P&L
-- keeps counting a returned order's revenue forever unless something
-- explicitly moves its payment_status off 'paid'.

-- 1. Widen the status CHECK constraint (varchar + CHECK, not a native enum).
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_status_check";
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_status_check"
  CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('confirmed'::character varying)::"text", ('shipped'::character varying)::"text", ('delivered'::character varying)::"text", ('cancelled'::character varying)::"text", ('returned'::character varying)::"text"])));

-- 2. Allow refund rows in the customer dues ledger. A refund is stored as a
-- negative amount pinned to the returned order's order_id — computeOrderBalances
-- (customerDueMath.ts) already sums payment.amount generically, so this needs
-- no other schema change.
ALTER TABLE "public"."customer_payments" DROP CONSTRAINT "customer_payments_amount_check";
ALTER TABLE "public"."customer_payments" ADD CONSTRAINT "customer_payments_amount_check" CHECK (("amount" <> 0));

-- 3. Give the dashboard's per-status breakdown a "returned" bucket, mirroring
-- status_cancelled exactly.
ALTER TABLE "public"."dashboard_daily_metrics" ADD COLUMN IF NOT EXISTS "status_returned" integer DEFAULT 0 NOT NULL;

CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_daily_metrics"(
    "p_store_id" "uuid", "p_summary_date" "date"
) RETURNS void
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE store_id = p_store_id
      AND (created_at AT TIME ZONE 'Asia/Dhaka')::date = p_summary_date
  ) THEN
    DELETE FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date = p_summary_date;
    DELETE FROM public.dashboard_daily_product_summary WHERE store_id = p_store_id AND summary_date = p_summary_date;
    RETURN;
  END IF;

  INSERT INTO public.dashboard_daily_metrics (
    store_id, summary_date, orders_count, order_value_sum, paid_orders_count,
    paid_revenue, gross_profit, status_pending, status_confirmed, status_shipped,
    status_delivered, status_cancelled, status_returned, payment_pending_amount, payment_paid_amount,
    payment_refunded_amount, payment_pending_count, payment_paid_count,
    payment_refunded_count, updated_at
  )
  SELECT
    p_store_id,
    p_summary_date,
    COUNT(*),
    COALESCE(SUM(o.total_amount - o.shipping_fee), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'paid'),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'paid'), 0),
    COALESCE((
      SELECT SUM(
        (oi.unit_price * (CASE WHEN o2.subtotal = 0 THEN 1 ELSE (o2.total_amount - o2.shipping_fee) / o2.subtotal END)
          - COALESCE(oi.cost_price, pv.tp_price, p2.tp_price, 0)) * oi.quantity
      )
      FROM public.order_items oi
      JOIN public.orders o2 ON o2.id = oi.order_id
      LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN public.products p2 ON p2.id = oi.product_id
      WHERE o2.store_id = p_store_id
        AND (o2.created_at AT TIME ZONE 'Asia/Dhaka')::date = p_summary_date
        AND o2.payment_status = 'paid'
    ), 0)
    +
    COALESCE((
      SELECT SUM(o3.shipping_fee - COALESCE(latest_cost.amount, o3.shipping_fee))
      FROM public.orders o3
      LEFT JOIN LATERAL (
        SELECT odc.amount
        FROM public.order_delivery_costs odc
        WHERE odc.order_id = o3.id
        ORDER BY odc.created_at DESC
        LIMIT 1
      ) latest_cost ON true
      WHERE o3.store_id = p_store_id
        AND (o3.created_at AT TIME ZONE 'Asia/Dhaka')::date = p_summary_date
        AND o3.payment_status = 'paid'
    ), 0),
    COUNT(*) FILTER (WHERE o.status = 'pending'),
    COUNT(*) FILTER (WHERE o.status = 'confirmed'),
    COUNT(*) FILTER (WHERE o.status = 'shipped'),
    COUNT(*) FILTER (WHERE o.status = 'delivered'),
    COUNT(*) FILTER (WHERE o.status = 'cancelled'),
    COUNT(*) FILTER (WHERE o.status = 'returned'),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'pending'), 0),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'paid'), 0),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'refunded'), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'pending'),
    COUNT(*) FILTER (WHERE o.payment_status = 'paid'),
    COUNT(*) FILTER (WHERE o.payment_status = 'refunded'),
    now()
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND (o.created_at AT TIME ZONE 'Asia/Dhaka')::date = p_summary_date
  ON CONFLICT (store_id, summary_date) DO UPDATE SET
    orders_count = EXCLUDED.orders_count,
    order_value_sum = EXCLUDED.order_value_sum,
    paid_orders_count = EXCLUDED.paid_orders_count,
    paid_revenue = EXCLUDED.paid_revenue,
    gross_profit = EXCLUDED.gross_profit,
    status_pending = EXCLUDED.status_pending,
    status_confirmed = EXCLUDED.status_confirmed,
    status_shipped = EXCLUDED.status_shipped,
    status_delivered = EXCLUDED.status_delivered,
    status_cancelled = EXCLUDED.status_cancelled,
    status_returned = EXCLUDED.status_returned,
    payment_pending_amount = EXCLUDED.payment_pending_amount,
    payment_paid_amount = EXCLUDED.payment_paid_amount,
    payment_refunded_amount = EXCLUDED.payment_refunded_amount,
    payment_pending_count = EXCLUDED.payment_pending_count,
    payment_paid_count = EXCLUDED.payment_paid_count,
    payment_refunded_count = EXCLUDED.payment_refunded_count,
    updated_at = now();

  DELETE FROM public.dashboard_daily_product_summary WHERE store_id = p_store_id AND summary_date = p_summary_date;
  INSERT INTO public.dashboard_daily_product_summary (store_id, summary_date, product_name, quantity, revenue, updated_at)
  SELECT
    p_store_id,
    p_summary_date,
    oi.product_name,
    SUM(oi.quantity),
    SUM(oi.unit_price * oi.quantity * (CASE WHEN o.subtotal = 0 THEN 1 ELSE (o.total_amount - o.shipping_fee) / o.subtotal END)),
    now()
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.store_id = p_store_id
    AND (o.created_at AT TIME ZONE 'Asia/Dhaka')::date = p_summary_date
    AND o.payment_status = 'paid'
  GROUP BY oi.product_name;
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_daily_metrics"("uuid", "date") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_daily_metrics"("uuid", "date") TO "service_role";

-- 4. Track returns as their own signal in the cross-store COD risk profile,
-- distinct from cancelled_orders — an admin reading the risk reason
-- ("cancelled" vs "returned") needs to tell "never accepted the delivery"
-- apart from "accepted it, then sent it back" (different behavior pattern).
ALTER TABLE "public"."customer_risk_profiles" ADD COLUMN IF NOT EXISTS "returned_orders" integer DEFAULT 0 NOT NULL;

-- 5. Reflect the new bucket in the dashboard summary RPC's order_status_counts
-- (identical to the 20260719000006 definition otherwise — only the 'returned'
-- key is new).
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
        'cancelled', COALESCE(SUM(status_cancelled), 0),
        'returned', COALESCE(SUM(status_returned), 0)
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
