-- The dashboard's daily rollup (dashboard_daily_metrics etc.) has always
-- bucketed by created_at (row-insert time), same bug already fixed for the
-- Sales Report in getSalesReport.ts — a backdated/edited Quick Sale entry,
-- or any order whose order_date an admin corrected, lands in the wrong
-- day's dashboard numbers instead of the day it actually happened. Switches
-- every bucketing point (the recompute functions and their triggers) from
-- created_at to orders.order_date, then backfills every existing bucket so
-- past drift is corrected too, not just future writes.
--
-- get_dashboard_summary() itself needs no change — it only reads
-- dashboard_daily_metrics.summary_date ranges, which now key off order_date
-- automatically once the functions below do.

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
        AND o2.order_date = p_summary_date
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
        AND o3.order_date = p_summary_date
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
    AND o.order_date = p_summary_date
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
    AND o.order_date = p_summary_date
    AND o.payment_status = 'paid'
  GROUP BY oi.product_name;
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_daily_metrics"("uuid", "date") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_daily_metrics"("uuid", "date") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_customer_summary"(
    "p_store_id" "uuid", "p_customer_id" "uuid"
) RETURNS void
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE store_id = p_store_id AND customer_id = p_customer_id) THEN
    DELETE FROM public.dashboard_customer_summary WHERE store_id = p_store_id AND customer_id = p_customer_id;
    RETURN;
  END IF;

  INSERT INTO public.dashboard_customer_summary (store_id, customer_id, first_order_date, total_orders, paid_total_spent, updated_at)
  SELECT
    p_store_id,
    p_customer_id,
    MIN(order_date),
    COUNT(*),
    COALESCE(SUM(total_amount - shipping_fee) FILTER (WHERE payment_status = 'paid'), 0),
    now()
  FROM public.orders
  WHERE store_id = p_store_id AND customer_id = p_customer_id
  ON CONFLICT (store_id, customer_id) DO UPDATE SET
    first_order_date = EXCLUDED.first_order_date,
    total_orders = EXCLUDED.total_orders,
    paid_total_spent = EXCLUDED.paid_total_spent,
    updated_at = now();
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_customer_summary"("uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_customer_summary"("uuid", "uuid") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."trg_orders_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_dashboard_daily_metrics(OLD.store_id, OLD.order_date);
    PERFORM public.recompute_dashboard_customer_summary(OLD.store_id, OLD.customer_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_dashboard_daily_metrics(NEW.store_id, NEW.order_date);
  PERFORM public.recompute_dashboard_customer_summary(NEW.store_id, NEW.customer_id);

  -- An admin can back-date/correct order_date after the fact (unlike
  -- created_at, which never changes) — when that moves an order to a
  -- different day, the day it's leaving needs recomputing too, or it keeps
  -- counting an order that no longer belongs to it.
  IF TG_OP = 'UPDATE' AND (
    OLD.order_date <> NEW.order_date
    OR OLD.store_id <> NEW.store_id
  ) THEN
    PERFORM public.recompute_dashboard_daily_metrics(OLD.store_id, OLD.order_date);
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    PERFORM public.recompute_dashboard_customer_summary(OLD.store_id, OLD.customer_id);
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trg_orders_dashboard"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."trg_order_items_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
  v_summary_date date;
BEGIN
  SELECT store_id, order_date
    INTO v_store_id, v_summary_date
  FROM public.orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  IF v_store_id IS NOT NULL THEN
    PERFORM public.recompute_dashboard_daily_metrics(v_store_id, v_summary_date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trg_order_items_dashboard"() OWNER TO "postgres";

-- One-time correction: rebuild every existing bucket under the order_date
-- rule (harmless no-op for orders whose order_date already equals their
-- created_at's date — only orders someone actually backdated/corrected move
-- to a different bucket).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT store_id, order_date AS d FROM public.orders
  LOOP
    PERFORM public.recompute_dashboard_daily_metrics(r.store_id, r.d);
  END LOOP;

  FOR r IN
    SELECT DISTINCT store_id, customer_id FROM public.orders WHERE customer_id IS NOT NULL
  LOOP
    PERFORM public.recompute_dashboard_customer_summary(r.store_id, r.customer_id);
  END LOOP;
END $$;
