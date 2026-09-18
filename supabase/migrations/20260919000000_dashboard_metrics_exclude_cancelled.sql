-- Every revenue/profit figure the Dashboard and Profit & Loss report compute
-- only ever filtered on payment_status = 'paid' — never on the order's own
-- status. A cancelled (or returned) order whose payment_status still reads
-- 'paid' because the refund was never separately recorded therefore counted
-- in full as revenue and profit, while the Sales Report and Register Audit
-- (which do exclude status IN ('cancelled','returned')) correctly left it
-- out — so the same date range could show materially different "revenue"
-- across screens for no reason other than this gap. Customer due and vendor
-- order due had the identical class of bug, fixed earlier the same way.
--
-- Deliberately NOT touched: orders_count, order_value_sum (Avg Order Value),
-- and the status_* breakdown counts — those aren't revenue/profit figures,
-- and status_cancelled/status_returned specifically need the full order set
-- to mean anything. Only figures that represent money actually earned are
-- scoped down here.
--
-- This function (like 20260918000000 before it) references status_returned,
-- added to dashboard_daily_metrics by 20260910000002_add_order_returned_status.sql
-- — but that migration's file existing in the repo doesn't mean it was ever
-- actually run against this database (migrations here are applied by hand,
-- one at a time; see the db-migration skill). Re-adding it here with
-- IF NOT EXISTS makes this migration self-sufficient regardless of whether
-- that one was ever applied — safe no-op if it was, fixes the gap if not.
ALTER TABLE "public"."dashboard_daily_metrics"
  ADD COLUMN IF NOT EXISTS "status_returned" integer DEFAULT 0 NOT NULL;

-- Same self-sufficiency for order_delivery_costs (from
-- 20260910000000_add_order_delivery_costs.sql) — the gross_profit subquery
-- below LEFT JOINs it, and running this migration against a database where
-- that one was never applied failed outright with
-- "relation order_delivery_costs does not exist". Recreating the table,
-- its RLS/policy, and its recompute trigger here (all guarded, so a no-op
-- if already present) means this migration no longer depends on that one
-- having been run first.
CREATE TABLE IF NOT EXISTS "public"."order_delivery_costs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "note" text,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Ran partway on an earlier attempt (this table + its pkey already exist
-- from that), so this specifically also catches invalid_table_definition
-- (42P16, "multiple primary keys") — a table can only ever have one, and
-- Postgres raises that distinct error code rather than duplicate_object
-- when the constraint being added is a second primary key, even under a
-- different name.
DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_delivery_costs"
    ADD CONSTRAINT "order_delivery_costs_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_delivery_costs"
    ADD CONSTRAINT "order_delivery_costs_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_delivery_costs"
    ADD CONSTRAINT "order_delivery_costs_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_delivery_costs"
    ADD CONSTRAINT "order_delivery_costs_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "order_delivery_costs_order_id_idx" ON "public"."order_delivery_costs" ("order_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "order_delivery_costs_store_id_idx" ON "public"."order_delivery_costs" ("store_id");

GRANT ALL ON TABLE "public"."order_delivery_costs" TO "service_role";
GRANT ALL ON TABLE "public"."order_delivery_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."order_delivery_costs" TO "anon";

ALTER TABLE "public"."order_delivery_costs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_delivery_costs_owner_select" ON "public"."order_delivery_costs";
CREATE POLICY "order_delivery_costs_owner_select" ON "public"."order_delivery_costs" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

CREATE OR REPLACE FUNCTION "public"."trg_order_delivery_costs_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
  v_summary_date date;
BEGIN
  SELECT o.store_id, o.order_date
    INTO v_store_id, v_summary_date
  FROM public.orders o WHERE o.id = COALESCE(NEW.order_id, OLD.order_id);

  IF v_store_id IS NOT NULL THEN
    PERFORM public.recompute_dashboard_daily_metrics(v_store_id, v_summary_date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trg_order_delivery_costs_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "order_delivery_costs_dashboard_recompute" ON "public"."order_delivery_costs";
CREATE TRIGGER "order_delivery_costs_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."order_delivery_costs"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_order_delivery_costs_dashboard"();

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
    COUNT(*) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0),
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
        AND o2.status NOT IN ('cancelled', 'returned')
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
        AND o3.status NOT IN ('cancelled', 'returned')
    ), 0),
    COUNT(*) FILTER (WHERE o.status = 'pending'),
    COUNT(*) FILTER (WHERE o.status = 'confirmed'),
    COUNT(*) FILTER (WHERE o.status = 'shipped'),
    COUNT(*) FILTER (WHERE o.status = 'delivered'),
    COUNT(*) FILTER (WHERE o.status = 'cancelled'),
    COUNT(*) FILTER (WHERE o.status = 'returned'),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'pending'), 0),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0),
    COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'refunded'), 0),
    COUNT(*) FILTER (WHERE o.payment_status = 'pending'),
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
    AND o.status NOT IN ('cancelled', 'returned')
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
    COALESCE(SUM(total_amount - shipping_fee) FILTER (WHERE payment_status = 'paid' AND status NOT IN ('cancelled', 'returned')), 0),
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

-- Same fix for the dedicated Profit & Loss report, which queries orders
-- directly rather than through the rollup table for cogs/delivery_net_cost.
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

  SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
  FROM public.dashboard_daily_metrics
  WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

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

-- One-time correction: rebuild every existing daily bucket under the fixed
-- rule (harmless no-op for a day with no cancelled-but-paid orders — only
-- days that actually had one see their numbers move).
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
