-- Money still owed, counted once.
--
-- 1. Customer due no longer includes online COD orders. That money is with
--    the courier and is already counted under COD pending, so an order
--    showed up twice (e.g. a ৳2,080 online COD order in both columns).
--    Customer due is now what customers owe the shop directly (Quick Sale /
--    due sales), and Customer due + COD pending = everything still owed.
-- 2. "Pending amount" (Payment flow) leaves out cancelled and returned
--    orders whose payment status was never changed — that money will never
--    come. Every past day is rebuilt once.
--
-- Function bodies are 20261007000000's with only those filters changed.
-- Requires 20261007000000_sales_received.sql.

-- Store-wide daily rollup ----------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_daily_metrics"(
    "p_store_id" "uuid", "p_summary_date" "date"
) RETURNS void
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE store_id = p_store_id
      AND order_date = p_summary_date
  ) THEN
    DELETE FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date = p_summary_date;
    DELETE FROM public.dashboard_daily_product_summary WHERE store_id = p_store_id AND summary_date = p_summary_date;
    RETURN;
  END IF;

  INSERT INTO public.dashboard_daily_metrics (
    store_id, summary_date, orders_count, order_value_sum, paid_orders_count,
    paid_revenue, gross_profit, sales_amount, sales_count,
    status_pending, status_confirmed, status_shipped,
    status_delivered, status_cancelled, status_returned, payment_pending_amount, payment_paid_amount,
    payment_refunded_amount, payment_pending_count, payment_paid_count,
    payment_refunded_count, updated_at
  )
  SELECT
    p_store_id,
    p_summary_date,
    COUNT(*),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')),
    -- Received: items − discount + extra charges on paid orders.
    COALESCE(SUM(COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0))
      FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE((
      SELECT SUM(
        (oi.unit_price * (CASE WHEN o2.subtotal = 0 THEN 1
            ELSE (COALESCE(o2.subtotal, 0) - COALESCE(o2.discount_amount, 0) + COALESCE(o2.additional_charges, 0)) / o2.subtotal END)
          - COALESCE(oi.cost_price, pv.tp_price, p2.tp_price, 0)) * oi.quantity
      )
      FROM public.order_items oi
      JOIN public.orders o2 ON o2.id = oi.order_id
      LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN public.products p2 ON p2.id = oi.product_id
      WHERE o2.store_id = p_store_id
        AND o2.order_date = p_summary_date
        AND o2.payment_status = 'paid'
        AND o2.status NOT IN ('cancelled', 'returned')
    ), 0)
    +
    COALESCE((
      SELECT SUM(COALESCE(o3.shipping_fee, 0) - COALESCE(latest_cost.amount, o3.shipping_fee, 0))
      FROM public.orders o3
      LEFT JOIN LATERAL (
        SELECT odc.amount
        FROM public.order_delivery_costs odc
        WHERE odc.order_id = o3.id
        ORDER BY odc.created_at DESC
        LIMIT 1
      ) latest_cost ON true
      WHERE o3.store_id = p_store_id
        AND o3.order_date = p_summary_date
        AND o3.payment_status = 'paid'
        AND o3.status NOT IN ('cancelled', 'returned')
    ), 0),
    -- Sales: the same amount on every order that isn't cancelled or returned.
    COALESCE(SUM(COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0))
      FILTER (WHERE o.status NOT IN ('cancelled', 'returned')), 0),
    COUNT(*) FILTER (WHERE o.status NOT IN ('cancelled', 'returned')),
    COUNT(*) FILTER (WHERE o.status = 'pending'),
    COUNT(*) FILTER (WHERE o.status = 'confirmed'),
    COUNT(*) FILTER (WHERE o.status = 'shipped'),
    COUNT(*) FILTER (WHERE o.status = 'delivered'),
    COUNT(*) FILTER (WHERE o.status = 'cancelled'),
    COUNT(*) FILTER (WHERE o.status = 'returned'),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)) FILTER (WHERE o.payment_status = 'pending' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)) FILTER (WHERE o.payment_status = 'refunded'), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'pending' AND o.status NOT IN ('cancelled', 'returned')),
    COUNT(*) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')),
    COUNT(*) FILTER (WHERE o.payment_status = 'refunded'),
    now()
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND o.order_date = p_summary_date
  ON CONFLICT (store_id, summary_date) DO UPDATE SET
    orders_count = EXCLUDED.orders_count,
    order_value_sum = EXCLUDED.order_value_sum,
    paid_orders_count = EXCLUDED.paid_orders_count,
    paid_revenue = EXCLUDED.paid_revenue,
    gross_profit = EXCLUDED.gross_profit,
    sales_amount = EXCLUDED.sales_amount,
    sales_count = EXCLUDED.sales_count,
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
    SUM(oi.unit_price * oi.quantity * (CASE WHEN o.subtotal = 0 THEN 1
      ELSE (COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0)) / o.subtotal END)),
    now()
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.store_id = p_store_id
    AND o.order_date = p_summary_date
    AND o.payment_status = 'paid'
    AND o.status NOT IN ('cancelled', 'returned')
  GROUP BY oi.product_name;
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_daily_metrics"("uuid", "date") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_daily_metrics"("uuid", "date") TO "service_role";

-- Per-branch daily rollup ----------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_branch_daily"("p_store_id" "uuid", "p_summary_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_store_id IS NULL OR p_summary_date IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.dashboard_branch_daily_metrics WHERE store_id = p_store_id AND summary_date = p_summary_date;
  DELETE FROM public.dashboard_branch_daily_product_summary WHERE store_id = p_store_id AND summary_date = p_summary_date;
  IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = p_store_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.dashboard_branch_daily_metrics (
    store_id, branch_id, summary_date, orders_count, order_value_sum, paid_orders_count,
    paid_revenue, gross_profit, sales_amount, sales_count,
    status_pending, status_confirmed, status_shipped,
    status_delivered, status_cancelled, status_returned, payment_pending_amount, payment_paid_amount,
    payment_refunded_amount, payment_pending_count, payment_paid_count,
    payment_refunded_count, updated_at
  )
  SELECT
    p_store_id,
    o.branch_id,
    p_summary_date,
    COUNT(*),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')),
    COALESCE(SUM(COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0))
      FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE((
      SELECT SUM(
        (oi.unit_price * (CASE WHEN o2.subtotal = 0 THEN 1
            ELSE (COALESCE(o2.subtotal, 0) - COALESCE(o2.discount_amount, 0) + COALESCE(o2.additional_charges, 0)) / o2.subtotal END)
          - COALESCE(oi.cost_price, pv.tp_price, p2.tp_price, 0)) * oi.quantity
      )
      FROM public.order_items oi
      JOIN public.orders o2 ON o2.id = oi.order_id
      LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN public.products p2 ON p2.id = oi.product_id
      WHERE o2.store_id = p_store_id
        AND o2.branch_id = o.branch_id
        AND o2.order_date = p_summary_date
        AND o2.payment_status = 'paid'
        AND o2.status NOT IN ('cancelled', 'returned')
    ), 0)
    +
    COALESCE((
      SELECT SUM(COALESCE(o3.shipping_fee, 0) - COALESCE(latest_cost.amount, o3.shipping_fee, 0))
      FROM public.orders o3
      LEFT JOIN LATERAL (
        SELECT odc.amount FROM public.order_delivery_costs odc
        WHERE odc.order_id = o3.id ORDER BY odc.created_at DESC LIMIT 1
      ) latest_cost ON true
      WHERE o3.store_id = p_store_id
        AND o3.branch_id = o.branch_id
        AND o3.order_date = p_summary_date
        AND o3.payment_status = 'paid'
        AND o3.status NOT IN ('cancelled', 'returned')
    ), 0),
    COALESCE(SUM(COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0))
      FILTER (WHERE o.status NOT IN ('cancelled', 'returned')), 0),
    COUNT(*) FILTER (WHERE o.status NOT IN ('cancelled', 'returned')),
    COUNT(*) FILTER (WHERE o.status = 'pending'),
    COUNT(*) FILTER (WHERE o.status = 'confirmed'),
    COUNT(*) FILTER (WHERE o.status = 'shipped'),
    COUNT(*) FILTER (WHERE o.status = 'delivered'),
    COUNT(*) FILTER (WHERE o.status = 'cancelled'),
    COUNT(*) FILTER (WHERE o.status = 'returned'),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)) FILTER (WHERE o.payment_status = 'pending' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE(SUM(o.total_amount - COALESCE(o.shipping_fee, 0)) FILTER (WHERE o.payment_status = 'refunded'), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'pending' AND o.status NOT IN ('cancelled', 'returned')),
    COUNT(*) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')),
    COUNT(*) FILTER (WHERE o.payment_status = 'refunded'),
    now()
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND o.order_date = p_summary_date
    AND o.branch_id IS NOT NULL
  GROUP BY o.branch_id;

  INSERT INTO public.dashboard_branch_daily_product_summary (store_id, branch_id, summary_date, product_name, quantity, revenue, updated_at)
  SELECT
    p_store_id,
    o.branch_id,
    p_summary_date,
    oi.product_name,
    SUM(oi.quantity),
    SUM(oi.unit_price * oi.quantity * (CASE WHEN o.subtotal = 0 THEN 1
      ELSE (COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0)) / o.subtotal END)),
    now()
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.store_id = p_store_id
    AND o.order_date = p_summary_date
    AND o.branch_id IS NOT NULL
    AND o.payment_status = 'paid'
    AND o.status NOT IN ('cancelled', 'returned')
    AND oi.product_name IS NOT NULL
  GROUP BY o.branch_id, oi.product_name;
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_branch_daily"("uuid", "date") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_branch_daily"("uuid", "date") TO "service_role";

-- Rebuild every past day once ------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT store_id, order_date FROM public.orders WHERE order_date IS NOT NULL LOOP
    PERFORM public.recompute_dashboard_daily_metrics(r.store_id, r.order_date);
    PERFORM public.recompute_dashboard_branch_daily(r.store_id, r.order_date);
  END LOOP;
END $$;

-- Branch comparison: customer due without online COD ----------------------
CREATE OR REPLACE FUNCTION "public"."get_branch_comparison"(
    "p_store_id" "uuid", "p_period_start" "date", "p_period_end" "date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;

  WITH b AS (
    SELECT sb.id, sb.name, sb.priority, sb.is_active
    FROM public.store_branches sb
    WHERE sb.store_id = p_store_id AND public.can_view_store_branch(p_store_id, sb.id)
  ),
  m AS (
    SELECT branch_id,
           SUM(sales_count) AS orders_count,
           SUM(sales_amount) AS sales,
           SUM(paid_revenue) AS received,
           SUM(gross_profit) AS gross_profit
    FROM public.dashboard_branch_daily_metrics
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end
    GROUP BY branch_id
  ),
  ex AS (
    SELECT branch_id, SUM(amount) AS amount
    FROM public.expenses
    WHERE store_id = p_store_id AND expense_date BETWEEN p_period_start AND p_period_end
    GROUP BY branch_id
  ),
  open_orders AS (
    SELECT o.id, o.branch_id, o.customer_id, o.total_amount
    FROM public.orders o
    WHERE o.store_id = p_store_id AND o.branch_id IS NOT NULL AND o.customer_id IS NOT NULL
      AND o.payment_status NOT IN ('paid', 'refunded')
      AND o.status NOT IN ('cancelled', 'returned')
      -- Online COD is the courier's to hand over — it's under COD pending.
      AND NOT (o.payment_method = 'cod' AND o.channel IS DISTINCT FROM 'pos')
  ),
  due AS (
    SELECT x.branch_id, SUM(GREATEST(x.owed - x.paid, 0)) AS amount
    FROM (
      SELECT oo.branch_id, oo.customer_id,
             SUM(oo.total_amount) AS owed,
             COALESCE((
               SELECT SUM(cp.amount) FROM public.customer_payments cp
               WHERE cp.store_id = p_store_id AND cp.customer_id = oo.customer_id
                 AND (cp.order_id IN (SELECT id FROM open_orders WHERE branch_id = oo.branch_id AND customer_id = oo.customer_id)
                      OR (cp.order_id IS NULL AND cp.branch_id = oo.branch_id))
             ), 0) AS paid
      FROM open_orders oo
      GROUP BY oo.branch_id, oo.customer_id
    ) x
    GROUP BY x.branch_id
  ),
  cod AS (
    SELECT o.branch_id, SUM(o.total_amount) AS amount
    FROM public.orders o
    WHERE o.store_id = p_store_id AND o.branch_id IS NOT NULL
      AND o.payment_method = 'cod' AND o.status = 'delivered' AND o.channel <> 'pos'
      AND o.cod_settlement_id IS NULL AND o.payment_status <> 'paid'
    GROUP BY o.branch_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'branch_id', b.id,
    'name', b.name,
    'is_active', b.is_active,
    'orders', COALESCE(m.orders_count, 0),
    'sales', COALESCE(m.sales, 0),
    'received', COALESCE(m.received, 0),
    'gross_profit', COALESCE(m.gross_profit, 0),
    'expenses', COALESCE(ex.amount, 0),
    'net', COALESCE(m.gross_profit, 0) - COALESCE(ex.amount, 0),
    'customer_due', COALESCE(due.amount, 0),
    'cod_pending', COALESCE(cod.amount, 0)
  ) ORDER BY b.priority), '[]'::jsonb)
  INTO v_result
  FROM b
  LEFT JOIN m ON m.branch_id = b.id
  LEFT JOIN ex ON ex.branch_id = b.id
  LEFT JOIN due ON due.branch_id = b.id
  LEFT JOIN cod ON cod.branch_id = b.id;

  RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."get_branch_comparison"("uuid", "date", "date") OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_branch_comparison"("uuid", "date", "date") TO "authenticated";
