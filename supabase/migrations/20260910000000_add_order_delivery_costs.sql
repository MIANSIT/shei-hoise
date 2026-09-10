-- Tracks what the store actually paid the courier for an order, as a
-- HISTORY (not one column on orders) — a courier cost is often revised
-- after an initial estimate (failed delivery attempts, weight/distance
-- surcharges, a final invoice that lands later than the order itself), and
-- this needs to keep every entry, not overwrite the last one.
--
-- Separate from shipping_fee (what the customer was charged, already a
-- column on orders): a flat "inside Dhaka: 80" default charged to the
-- customer vs. a courier invoice of 90 is exactly the gap this exists to
-- record — until now that gap was invisible, since the P&L dashboard's
-- gross_profit netted shipping_fee out of revenue entirely, implicitly
-- assuming shipping revenue always equals shipping cost.
CREATE TABLE IF NOT EXISTS "public"."order_delivery_costs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "note" text,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_delivery_costs"
    ADD CONSTRAINT "order_delivery_costs_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

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

-- All writes go through supabaseAdmin (service_role, bypasses RLS) inside
-- "use server" functions, same as customer_payments/vendor_payments — so
-- only a SELECT policy is needed; direct writes from the browser's
-- anon/authenticated client are denied by default with RLS on and no write
-- policy.
ALTER TABLE "public"."order_delivery_costs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_delivery_costs_owner_select" ON "public"."order_delivery_costs";
CREATE POLICY "order_delivery_costs_owner_select" ON "public"."order_delivery_costs" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

COMMENT ON TABLE "public"."order_delivery_costs" IS
  'History of what the store actually paid the courier for an order — one row per revision (estimate, then a correction, then a final invoice). The most recent row per order_id is the current actual cost; used against shipping_fee to compute real shipping profit/loss in gross_profit.';

-- ── P&L: fold shipping margin into gross_profit ─────────────────────────
-- Re-points gross_profit at (product margin) + (shipping margin) instead of
-- product margin alone. The shipping term uses each order's MOST RECENT
-- order_delivery_costs row (a LATERAL join, not a plain join, since there
-- can be several revisions per order) and is summed once per order — a
-- separate subquery over orders, not order_items — so a multi-line order
-- doesn't have its shipping margin counted once per line item. An order
-- with no recorded actual cost yet contributes 0 (break-even), exactly
-- matching the pre-existing behavior.
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

-- New entries need to recompute their order's store+day bucket too — a
-- delivery cost recorded (or corrected) after the fact must retroactively
-- adjust that day's already-computed gross_profit, exactly like
-- trg_order_items_dashboard does for cost_price corrections.
CREATE OR REPLACE FUNCTION "public"."trg_order_delivery_costs_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
  v_summary_date date;
BEGIN
  SELECT o.store_id, (o.created_at AT TIME ZONE 'Asia/Dhaka')::date
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

-- One-off backfill: recompute every existing daily bucket under the new
-- formula. Harmless no-op everywhere today — order_delivery_costs starts
-- empty, so every order falls back to the break-even case and reproduces
-- the exact gross_profit values that already existed.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT store_id, (created_at AT TIME ZONE 'Asia/Dhaka')::date AS d FROM public.orders LOOP
    PERFORM public.recompute_dashboard_daily_metrics(r.store_id, r.d);
  END LOOP;
END $$;
