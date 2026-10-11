-- Dashboard profit no longer takes the discount off twice.
--
-- Each paid order's revenue (items - discount + extra charges) is split across
-- its items in proportion to their price, to work out profit per item. The
-- split divided by orders.subtotal, which assumes the items add up to it. On
-- orders where they don't (the items already carry the discounted price while
-- subtotal is the pre-discount figure, e.g. subtotal 1450, discount 250,
-- items 1200), the discount was applied a second time: revenue came out as
-- 1200 x 1200/1450 = 993 instead of 1200, so gross profit on the Dashboard,
-- the branch cards and the trend chart was too low (about 6,258 over 7 Jul
-- to 11 Oct for one store), while the Profit & Loss page, which uses the
-- real total, was right.
--
-- The split now divides by the items' own total, so an order's revenue always
-- adds up to what was received. Orders whose items do add up to subtotal
-- give exactly the same numbers as before.
--
-- Function bodies are 20261008000000's with only that ratio changed. Every
-- past day is rebuilt once at the end.

CREATE OR REPLACE FUNCTION "public"."order_items_total"("p_order_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(SUM(unit_price * quantity), 0) FROM public.order_items WHERE order_id = p_order_id;
$$;

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
        (oi.unit_price * (CASE WHEN public.order_items_total(o2.id) = 0 THEN 1
            ELSE (COALESCE(o2.subtotal, 0) - COALESCE(o2.discount_amount, 0) + COALESCE(o2.additional_charges, 0)) / public.order_items_total(o2.id) END)
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
    SUM(oi.unit_price * oi.quantity * (CASE WHEN public.order_items_total(o.id) = 0 THEN 1
      ELSE (COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0)) / public.order_items_total(o.id) END)),
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
        (oi.unit_price * (CASE WHEN public.order_items_total(o2.id) = 0 THEN 1
            ELSE (COALESCE(o2.subtotal, 0) - COALESCE(o2.discount_amount, 0) + COALESCE(o2.additional_charges, 0)) / public.order_items_total(o2.id) END)
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
    SUM(oi.unit_price * oi.quantity * (CASE WHEN public.order_items_total(o.id) = 0 THEN 1
      ELSE (COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0)) / public.order_items_total(o.id) END)),
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
