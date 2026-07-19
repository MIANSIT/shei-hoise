-- Keeps dashboard_daily_metrics / dashboard_daily_product_summary /
-- dashboard_customer_summary / dashboard_daily_expense_category_summary
-- current by RECOMPUTING the affected bucket from raw data on every write,
-- rather than incrementing/decrementing a running total. A delta-based
-- counter drifts the moment an order is refunded, cancelled, or edited
-- (order_items changed after the fact) — recomputing the one affected
-- store+day (or store+customer) bucket stays cheap regardless of how much
-- order history a store has, and can never drift.
--
-- Bucketed by the merchant's own business day (Asia/Dhaka), not server/UTC
-- date — otherwise early-morning BDT orders would land in "yesterday" from
-- the store owner's point of view.
--
-- Triggered on `orders` AFTER INSERT/UPDATE/DELETE: payment_status/status
-- are written from several independent call sites (initial insert in
-- orderService.ts, updateOrder.ts's updatePaymentStatus, the full-order-edit
-- path in updateOrderByNumber.ts, and bulkUpdateOrders.ts) with no single
-- choke point in application code — a trigger on the table itself is the
-- only place guaranteed to catch all of them, including future call sites.
-- Also triggered on `order_items` (cost_price corrections and line-item
-- edits after the parent order already exists) and on `expenses`.

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
    status_delivered, status_cancelled, payment_pending_amount, payment_paid_amount,
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
    ), 0),
    COUNT(*) FILTER (WHERE o.status = 'pending'),
    COUNT(*) FILTER (WHERE o.status = 'confirmed'),
    COUNT(*) FILTER (WHERE o.status = 'shipped'),
    COUNT(*) FILTER (WHERE o.status = 'delivered'),
    COUNT(*) FILTER (WHERE o.status = 'cancelled'),
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

-- Recomputes one customer's all-time snapshot (new-customer / returning-rate /
-- top-spender all read off this). Bucket = "this customer's full order
-- history" — there's no day dimension to bound it by, unlike the table above.
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
    MIN((created_at AT TIME ZONE 'Asia/Dhaka')::date),
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
    PERFORM public.recompute_dashboard_daily_metrics(OLD.store_id, (OLD.created_at AT TIME ZONE 'Asia/Dhaka')::date);
    PERFORM public.recompute_dashboard_customer_summary(OLD.store_id, OLD.customer_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_dashboard_daily_metrics(NEW.store_id, (NEW.created_at AT TIME ZONE 'Asia/Dhaka')::date);
  PERFORM public.recompute_dashboard_customer_summary(NEW.store_id, NEW.customer_id);

  IF TG_OP = 'UPDATE' AND (
    (OLD.created_at AT TIME ZONE 'Asia/Dhaka')::date <> (NEW.created_at AT TIME ZONE 'Asia/Dhaka')::date
    OR OLD.store_id <> NEW.store_id
  ) THEN
    PERFORM public.recompute_dashboard_daily_metrics(OLD.store_id, (OLD.created_at AT TIME ZONE 'Asia/Dhaka')::date);
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    PERFORM public.recompute_dashboard_customer_summary(OLD.store_id, OLD.customer_id);
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trg_orders_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "orders_dashboard_recompute" ON "public"."orders";
CREATE TRIGGER "orders_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_dashboard"();

-- order_items has no store_id of its own — resolve it through the parent
-- order. Covers cost_price corrections and the insert/update/delete diff
-- updateOrderByNumber.ts performs against an existing order's line items.
CREATE OR REPLACE FUNCTION "public"."trg_order_items_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
  v_summary_date date;
BEGIN
  SELECT store_id, (created_at AT TIME ZONE 'Asia/Dhaka')::date
    INTO v_store_id, v_summary_date
  FROM public.orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  IF v_store_id IS NOT NULL THEN
    PERFORM public.recompute_dashboard_daily_metrics(v_store_id, v_summary_date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trg_order_items_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "order_items_dashboard_recompute" ON "public"."order_items";
CREATE TRIGGER "order_items_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."order_items"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_order_items_dashboard"();

-- Expenses: covers createExpense/updateExpense/deleteExpense uniformly.
CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_expense_category_summary"(
    "p_store_id" "uuid", "p_summary_date" "date", "p_category_id" "uuid"
) RETURNS void
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses
    WHERE store_id = p_store_id AND expense_date = p_summary_date AND category_id = p_category_id
  ) THEN
    DELETE FROM public.dashboard_daily_expense_category_summary
      WHERE store_id = p_store_id AND summary_date = p_summary_date AND category_id = p_category_id;
    RETURN;
  END IF;

  INSERT INTO public.dashboard_daily_expense_category_summary (store_id, summary_date, category_id, amount, expense_count, updated_at)
  SELECT p_store_id, p_summary_date, p_category_id, SUM(amount), COUNT(*), now()
  FROM public.expenses
  WHERE store_id = p_store_id AND expense_date = p_summary_date AND category_id = p_category_id
  ON CONFLICT (store_id, summary_date, category_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    expense_count = EXCLUDED.expense_count,
    updated_at = now();
END;
$$;
ALTER FUNCTION "public"."recompute_dashboard_expense_category_summary"("uuid", "date", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."recompute_dashboard_expense_category_summary"("uuid", "date", "uuid") TO "service_role";

CREATE OR REPLACE FUNCTION "public"."trg_expenses_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_dashboard_expense_category_summary(OLD.store_id, OLD.expense_date, OLD.category_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_dashboard_expense_category_summary(NEW.store_id, NEW.expense_date, NEW.category_id);

  IF TG_OP = 'UPDATE' AND (
    OLD.expense_date <> NEW.expense_date OR OLD.category_id <> NEW.category_id OR OLD.store_id <> NEW.store_id
  ) THEN
    PERFORM public.recompute_dashboard_expense_category_summary(OLD.store_id, OLD.expense_date, OLD.category_id);
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trg_expenses_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "expenses_dashboard_recompute" ON "public"."expenses";
CREATE TRIGGER "expenses_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."expenses"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_expenses_dashboard"();
