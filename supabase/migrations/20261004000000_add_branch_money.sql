-- Branch Hubs, phase 3: money and dashboard per branch.
--
-- Sales, profit, delivery cost and dues already belong to a branch through
-- orders.branch_id (phase 2). This adds a branch to every money record that
-- can exist without an order — expenses, customer payments, COD settlements,
-- the register's opening cash and vendor payments — so every taka sits in
-- exactly one branch and the branch figures add up to the brand total.
--
-- The dashboard keeps reading pre-built daily rollups: branch rollups sit
-- next to the existing ones, kept current by their own triggers, and
-- get_dashboard_summary / get_profit_loss_report take an optional branch.
-- Stores without branches are untouched: branch_id stays NULL everywhere and
-- every function behaves exactly as before.
--
-- Requires 20261002000000_add_store_branches.sql and
-- 20261003000000_add_order_branches.sql.

-- 1. Columns -----------------------------------------------------------------
ALTER TABLE "public"."expenses"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;
ALTER TABLE "public"."customer_payments"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;
ALTER TABLE "public"."store_cod_settlements"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;
ALTER TABLE "public"."store_register_openings"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;
ALTER TABLE "public"."vendor_payments"
  ADD COLUMN IF NOT EXISTS "branch_id" "uuid" REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "expenses_branch_date_idx" ON "public"."expenses" ("store_id", "branch_id", "expense_date");
CREATE INDEX IF NOT EXISTS "customer_payments_branch_idx" ON "public"."customer_payments" ("store_id", "branch_id");
CREATE INDEX IF NOT EXISTS "store_cod_settlements_branch_idx" ON "public"."store_cod_settlements" ("store_id", "branch_id");
CREATE INDEX IF NOT EXISTS "vendor_payments_branch_idx" ON "public"."vendor_payments" ("store_id", "branch_id");
CREATE INDEX IF NOT EXISTS "orders_store_branch_date_idx" ON "public"."orders" ("store_id", "branch_id", "order_date");

-- Each branch has its own drawer: one opening per store, branch and day
-- (branch NULL for stores without branches).
ALTER TABLE "public"."store_register_openings" DROP CONSTRAINT IF EXISTS "store_register_openings_store_date_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "store_register_openings_store_branch_date_key"
  ON "public"."store_register_openings" ("store_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "register_date");

-- 2. Every money row gets a branch -------------------------------------------
-- A payment against an order belongs to the order's branch. Anything else
-- the app didn't place lands on the default branch, so nothing is left
-- outside a branch once branches are on. A branch from another store is
-- rejected.
CREATE OR REPLACE FUNCTION "public"."trg_fill_money_branch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order_branch uuid;
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.store_branches WHERE id = NEW.branch_id AND store_id = NEW.store_id) THEN
      RAISE EXCEPTION 'That branch belongs to another store';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'customer_payments' AND NEW.order_id IS NOT NULL THEN
    SELECT branch_id INTO v_order_branch FROM public.orders WHERE id = NEW.order_id;
    NEW.branch_id := v_order_branch;
  END IF;

  IF NEW.branch_id IS NULL THEN
    NEW.branch_id := public.default_store_branch(NEW.store_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "expenses_fill_branch" ON "public"."expenses";
CREATE TRIGGER "expenses_fill_branch" BEFORE INSERT ON "public"."expenses"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_fill_money_branch"();
DROP TRIGGER IF EXISTS "customer_payments_fill_branch" ON "public"."customer_payments";
CREATE TRIGGER "customer_payments_fill_branch" BEFORE INSERT ON "public"."customer_payments"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_fill_money_branch"();
DROP TRIGGER IF EXISTS "store_cod_settlements_fill_branch" ON "public"."store_cod_settlements";
CREATE TRIGGER "store_cod_settlements_fill_branch" BEFORE INSERT ON "public"."store_cod_settlements"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_fill_money_branch"();
DROP TRIGGER IF EXISTS "store_register_openings_fill_branch" ON "public"."store_register_openings";
CREATE TRIGGER "store_register_openings_fill_branch" BEFORE INSERT ON "public"."store_register_openings"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_fill_money_branch"();
DROP TRIGGER IF EXISTS "vendor_payments_fill_branch" ON "public"."vendor_payments";
CREATE TRIGGER "vendor_payments_fill_branch" BEFORE INSERT ON "public"."vendor_payments"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_fill_money_branch"();

-- 3. Backfill (stores that already turned branches on) ------------------------
CREATE OR REPLACE FUNCTION "public"."backfill_store_money_branches"("p_store_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_default uuid := public.default_store_branch(p_store_id);
BEGIN
  IF v_default IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.expenses SET branch_id = v_default WHERE store_id = p_store_id AND branch_id IS NULL;
  UPDATE public.customer_payments cp
     SET branch_id = COALESCE((SELECT o.branch_id FROM public.orders o WHERE o.id = cp.order_id), v_default)
   WHERE cp.store_id = p_store_id AND cp.branch_id IS NULL;
  UPDATE public.store_cod_settlements s
     SET branch_id = COALESCE(
       (SELECT o.branch_id FROM public.orders o WHERE o.cod_settlement_id = s.id AND o.branch_id IS NOT NULL LIMIT 1),
       v_default)
   WHERE s.store_id = p_store_id AND s.branch_id IS NULL;
  UPDATE public.store_register_openings SET branch_id = v_default WHERE store_id = p_store_id AND branch_id IS NULL;
  UPDATE public.vendor_payments SET branch_id = v_default WHERE store_id = p_store_id AND branch_id IS NULL;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT store_id FROM public.store_branches LOOP
    PERFORM public.backfill_store_money_branches(r.store_id);
  END LOOP;
END $$;

-- Turning branches on later does the same (phase 2 body + the money backfill).
CREATE OR REPLACE FUNCTION "public"."enable_store_branches"("p_store_id" "uuid", "p_name" "text", "p_code" "text" DEFAULT NULL) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('enable_branches_' || p_store_id::text));
  IF EXISTS (SELECT 1 FROM public.store_branches WHERE store_id = p_store_id) THEN
    RAISE EXCEPTION 'Branches are already turned on for this store';
  END IF;

  INSERT INTO public.store_branches (store_id, name, code, priority)
  VALUES (p_store_id, p_name, NULLIF(p_code, ''), 1)
  RETURNING id INTO v_branch_id;

  PERFORM public.branch_sync_set(true);
  INSERT INTO public.branch_inventory
    (store_id, branch_id, product_id, variant_id, quantity_available, quantity_reserved, low_stock_threshold)
  SELECT p_store_id, v_branch_id, pi.product_id, pi.variant_id,
         COALESCE(pi.quantity_available, 0), COALESCE(pi.quantity_reserved, 0), COALESCE(pi.low_stock_threshold, 5)
  FROM public.product_inventory pi
  JOIN public.products p ON p.id = pi.product_id
  WHERE p.store_id = p_store_id AND pi.product_id IS NOT NULL;
  PERFORM public.branch_sync_set(false);

  UPDATE public.orders SET branch_id = v_branch_id WHERE store_id = p_store_id AND branch_id IS NULL;
  PERFORM public.backfill_store_money_branches(p_store_id);

  RETURN v_branch_id;
END;
$$;

-- 4. Branch rollups ------------------------------------------------------------
-- Same columns and rules as dashboard_daily_metrics / _product_summary
-- (20260919000000), one row per branch.
CREATE TABLE IF NOT EXISTS "public"."dashboard_branch_daily_metrics" (
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" "uuid" NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "summary_date" "date" NOT NULL,
    "orders_count" integer DEFAULT 0 NOT NULL,
    "order_value_sum" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_orders_count" integer DEFAULT 0 NOT NULL,
    "paid_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "gross_profit" numeric(12,2) DEFAULT 0 NOT NULL,
    "status_pending" integer DEFAULT 0 NOT NULL,
    "status_confirmed" integer DEFAULT 0 NOT NULL,
    "status_shipped" integer DEFAULT 0 NOT NULL,
    "status_delivered" integer DEFAULT 0 NOT NULL,
    "status_cancelled" integer DEFAULT 0 NOT NULL,
    "status_returned" integer DEFAULT 0 NOT NULL,
    "payment_pending_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_paid_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_refunded_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_pending_count" integer DEFAULT 0 NOT NULL,
    "payment_paid_count" integer DEFAULT 0 NOT NULL,
    "payment_refunded_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id", "branch_id", "summary_date")
);
ALTER TABLE "public"."dashboard_branch_daily_metrics" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_branch_daily_metrics" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."dashboard_branch_daily_metrics" TO "service_role";

CREATE TABLE IF NOT EXISTS "public"."dashboard_branch_daily_product_summary" (
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" "uuid" NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "summary_date" "date" NOT NULL,
    "product_name" "text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id", "branch_id", "summary_date", "product_name")
);
ALTER TABLE "public"."dashboard_branch_daily_product_summary" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_branch_daily_product_summary" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."dashboard_branch_daily_product_summary" TO "service_role";

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
    paid_revenue, gross_profit, status_pending, status_confirmed, status_shipped,
    status_delivered, status_cancelled, status_returned, payment_pending_amount, payment_paid_amount,
    payment_refunded_amount, payment_pending_count, payment_paid_count,
    payment_refunded_count, updated_at
  )
  SELECT
    p_store_id,
    o.branch_id,
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
        AND o2.branch_id = o.branch_id
        AND o2.order_date = p_summary_date
        AND o2.payment_status = 'paid'
        AND o2.status NOT IN ('cancelled', 'returned')
    ), 0)
    +
    COALESCE((
      SELECT SUM(o3.shipping_fee - COALESCE(latest_cost.amount, o3.shipping_fee))
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
    AND o.branch_id IS NOT NULL
  GROUP BY o.branch_id;

  INSERT INTO public.dashboard_branch_daily_product_summary (store_id, branch_id, summary_date, product_name, quantity, revenue, updated_at)
  SELECT
    p_store_id,
    o.branch_id,
    p_summary_date,
    oi.product_name,
    SUM(oi.quantity),
    SUM(oi.unit_price * oi.quantity * (CASE WHEN o.subtotal = 0 THEN 1 ELSE (o.total_amount - o.shipping_fee) / o.subtotal END)),
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

-- Kept current by their own triggers, next to the existing dashboard ones.
CREATE OR REPLACE FUNCTION "public"."trg_orders_branch_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_dashboard_branch_daily(OLD.store_id, OLD.order_date);
    RETURN OLD;
  END IF;
  -- Cheap exit for stores without branches.
  IF NEW.branch_id IS NULL AND (TG_OP = 'INSERT' OR OLD.branch_id IS NULL) THEN
    RETURN NEW;
  END IF;
  PERFORM public.recompute_dashboard_branch_daily(NEW.store_id, NEW.order_date);
  IF TG_OP = 'UPDATE' AND (OLD.order_date <> NEW.order_date OR OLD.store_id <> NEW.store_id) THEN
    PERFORM public.recompute_dashboard_branch_daily(OLD.store_id, OLD.order_date);
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."trg_orders_branch_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "orders_branch_dashboard_recompute" ON "public"."orders";
CREATE TRIGGER "orders_branch_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_branch_dashboard"();

-- order_items and order_delivery_costs: recompute their order's day.
CREATE OR REPLACE FUNCTION "public"."trg_order_child_branch_dashboard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_store_id uuid;
  v_date date;
  v_branch uuid;
BEGIN
  SELECT store_id, order_date, branch_id INTO v_store_id, v_date, v_branch
  FROM public.orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  IF v_branch IS NOT NULL THEN
    PERFORM public.recompute_dashboard_branch_daily(v_store_id, v_date);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION "public"."trg_order_child_branch_dashboard"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "order_items_branch_dashboard_recompute" ON "public"."order_items";
CREATE TRIGGER "order_items_branch_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."order_items"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_order_child_branch_dashboard"();
DROP TRIGGER IF EXISTS "order_delivery_costs_branch_dashboard_recompute" ON "public"."order_delivery_costs";
CREATE TRIGGER "order_delivery_costs_branch_dashboard_recompute"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."order_delivery_costs"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_order_child_branch_dashboard"();

-- Build the rollups for stores that already have branches.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT o.store_id, o.order_date
    FROM public.orders o
    WHERE o.branch_id IS NOT NULL AND o.order_date IS NOT NULL
  LOOP
    PERFORM public.recompute_dashboard_branch_daily(r.store_id, r.order_date);
  END LOOP;
END $$;

-- 5. Who may look at a branch -------------------------------------------------
-- The owner and "All branches" staff see every branch and the brand total
-- (p_branch_id NULL); other staff only their own branches.
CREATE OR REPLACE FUNCTION "public"."can_view_store_branch"("p_store_id" "uuid", "p_branch_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.store_id = p_store_id AND u.user_type = 'store_owner'
  ) OR EXISTS (
    SELECT 1 FROM public.store_staff s
    WHERE s.user_id = auth.uid() AND s.store_id = p_store_id AND s.is_active
      AND (s.all_branches OR (p_branch_id IS NOT NULL AND p_branch_id = ANY (s.branch_ids)))
  );
$$;
GRANT EXECUTE ON FUNCTION "public"."can_view_store_branch"("uuid", "uuid") TO "authenticated";

-- 6. Dashboard ------------------------------------------------------------------
-- One branch's dashboard, same shape as get_dashboard_summary.
CREATE OR REPLACE FUNCTION "public"."branch_dashboard_summary"(
    "p_store_id" "uuid", "p_branch_id" "uuid",
    "p_period_start" "date", "p_period_end" "date",
    "p_prev_period_start" "date", "p_prev_period_end" "date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_result jsonb;
BEGIN
  WITH m AS (
    SELECT * FROM public.dashboard_branch_daily_metrics WHERE store_id = p_store_id AND branch_id = p_branch_id
  ),
  e AS (
    SELECT * FROM public.expenses WHERE store_id = p_store_id AND branch_id = p_branch_id
  )
  SELECT jsonb_build_object(
    'revenue', COALESCE((SELECT SUM(paid_revenue) FROM m WHERE summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_revenue', COALESCE((SELECT SUM(paid_revenue) FROM m WHERE summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'order_count', COALESCE((SELECT SUM(orders_count) FROM m WHERE summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_order_count', COALESCE((SELECT SUM(orders_count) FROM m WHERE summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'order_value_sum', COALESCE((SELECT SUM(order_value_sum) FROM m WHERE summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_order_value_sum', COALESCE((SELECT SUM(order_value_sum) FROM m WHERE summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'paid_orders_count', COALESCE((SELECT SUM(paid_orders_count) FROM m WHERE summary_date BETWEEN p_period_start AND p_period_end), 0),
    'pending_payment_order_count', COALESCE((SELECT SUM(payment_pending_count) FROM m WHERE summary_date BETWEEN p_period_start AND p_period_end), 0),
    'gross_profit', COALESCE((SELECT SUM(gross_profit) FROM m WHERE summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_gross_profit', COALESCE((SELECT SUM(gross_profit) FROM m WHERE summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),

    'order_status_counts', (
      SELECT jsonb_build_object(
        'pending', COALESCE(SUM(status_pending), 0),
        'confirmed', COALESCE(SUM(status_confirmed), 0),
        'shipped', COALESCE(SUM(status_shipped), 0),
        'delivered', COALESCE(SUM(status_delivered), 0),
        'cancelled', COALESCE(SUM(status_cancelled), 0),
        'returned', COALESCE(SUM(status_returned), 0)
      ) FROM m
    ),
    'payment_amounts', (
      SELECT jsonb_build_object(
        'pending', COALESCE(SUM(payment_pending_amount), 0),
        'paid', COALESCE(SUM(payment_paid_amount), 0),
        'refunded', COALESCE(SUM(payment_refunded_amount), 0)
      ) FROM m
    ),

    'sales_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d.day, 'sales', COALESCE(mm.paid_revenue, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(v_today - INTERVAL '29 days', v_today, '1 day') AS d(day)
      LEFT JOIN m mm ON mm.summary_date = d.day::date
    ),

    'top_products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', product_name, 'revenue', total_revenue, 'quantity', total_qty)), '[]'::jsonb)
      FROM (
        SELECT product_name, SUM(revenue) AS total_revenue, SUM(quantity) AS total_qty
        FROM public.dashboard_branch_daily_product_summary
        WHERE store_id = p_store_id AND branch_id = p_branch_id
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 3
      ) top
    ),

    -- Customers of this branch, from its own orders.
    'customer_snapshot', (
      WITH c AS (
        SELECT o.customer_id,
               MIN(o.order_date) AS first_order_date,
               COUNT(*) AS total_orders,
               COALESCE(SUM(o.total_amount - o.shipping_fee) FILTER (WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled', 'returned')), 0) AS paid_total_spent
        FROM public.orders o
        WHERE o.store_id = p_store_id AND o.branch_id = p_branch_id AND o.customer_id IS NOT NULL
        GROUP BY o.customer_id
      )
      SELECT jsonb_build_object(
        'new_customers', COALESCE((SELECT COUNT(*) FROM c WHERE first_order_date BETWEEN p_period_start AND p_period_end), 0),
        'returning_rate', COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE total_orders > 1) / NULLIF(COUNT(*), 0), 1) FROM c), 0),
        'top_customer', COALESCE((
          SELECT jsonb_build_object('name', COALESCE(sc.name, 'Unknown'), 'total_spent', c.paid_total_spent)
          FROM c JOIN public.store_customers sc ON sc.id = c.customer_id
          ORDER BY c.paid_total_spent DESC
          LIMIT 1
        ), jsonb_build_object('name', 'No customers', 'total_spent', 0))
      )
    ),

    -- This branch's shelf, same rules as recompute_dashboard_inventory_summary.
    'inventory', (
      WITH lines AS (
        SELECT p.id AS pid,
               COALESCE(bi.quantity_available, 0) AS qa,
               COALESCE(bi.low_stock_threshold, pi.low_stock_threshold, 5) AS th,
               CASE WHEN pi.variant_id IS NOT NULL
                    THEN COALESCE(NULLIF(v.discounted_price, 0), v.base_price)
                    ELSE COALESCE(NULLIF(p.discounted_price, 0), p.base_price) END AS price
        FROM public.products p
        JOIN public.product_inventory pi ON pi.product_id = p.id
        LEFT JOIN public.product_variants v ON v.id = pi.variant_id
        LEFT JOIN public.branch_inventory bi
          ON bi.branch_id = p_branch_id AND bi.product_id = p.id AND bi.variant_id IS NOT DISTINCT FROM pi.variant_id
        WHERE p.store_id = p_store_id
          AND pi.track_inventory IS NOT FALSE
          AND (
            (pi.variant_id IS NOT NULL AND v.is_active IS NOT FALSE)
            OR (pi.variant_id IS NULL AND NOT EXISTS (
              SELECT 1 FROM public.product_variants v2 WHERE v2.product_id = p.id AND v2.is_active IS NOT FALSE))
          )
      ),
      per_product AS (
        SELECT pid,
               bool_or(qa > 0) AS any_stock,
               bool_or(qa <= 0) AS any_oos,
               bool_or(qa > 0 AND qa <= th) AS any_low,
               SUM(GREATEST(qa, 0)) AS units,
               SUM(GREATEST(qa, 0) * COALESCE(price, 0)) AS value
        FROM lines GROUP BY pid
      )
      SELECT jsonb_build_object(
        'in_stock_units', COALESCE(SUM(units), 0),
        'low_stock_product_count', COUNT(*) FILTER (WHERE any_stock AND NOT any_oos AND any_low),
        'out_of_stock_product_count', COUNT(*) FILTER (WHERE NOT any_stock),
        'partially_out_of_stock_product_count', COUNT(*) FILTER (WHERE any_stock AND any_oos),
        'total_inventory_value', COALESCE(SUM(value), 0)
      ) FROM per_product
    ),

    'expense_metrics', jsonb_build_object(
      'total_expenses', COALESCE((SELECT SUM(amount) FROM e WHERE expense_date BETWEEN p_period_start AND p_period_end), 0),
      'prev_total_expenses', COALESCE((SELECT SUM(amount) FROM e WHERE expense_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
      'expense_count', COALESCE((SELECT COUNT(*) FROM e WHERE expense_date BETWEEN p_period_start AND p_period_end), 0),
      'top_expense_category', COALESCE((
        SELECT jsonb_build_object('name', COALESCE(ec.name, 'Uncategorized'), 'amount', cat.amount)
        FROM (
          SELECT category_id, SUM(amount) AS amount FROM e
          WHERE expense_date BETWEEN p_period_start AND p_period_end
          GROUP BY category_id ORDER BY amount DESC LIMIT 1
        ) cat
        LEFT JOIN public.expense_categories ec ON ec.id = cat.category_id
      ), jsonb_build_object('name', 'None', 'amount', 0)),
      'expense_category_breakdown', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(ec.name, 'Uncategorized'), 'amount', cat.amount) ORDER BY cat.amount DESC), '[]'::jsonb)
        FROM (
          SELECT category_id, SUM(amount) AS amount FROM e
          WHERE expense_date BETWEEN p_period_start AND p_period_end
          GROUP BY category_id ORDER BY amount DESC LIMIT 5
        ) cat
        LEFT JOIN public.expense_categories ec ON ec.id = cat.category_id
      )
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."branch_dashboard_summary"("uuid", "uuid", "date", "date", "date", "date") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."branch_dashboard_summary"("uuid", "uuid", "date", "date", "date", "date") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."branch_dashboard_summary"("uuid", "uuid", "date", "date", "date", "date") TO "service_role";

-- get_dashboard_summary gains an optional branch. The old 5-argument version
-- is dropped so PostgREST has exactly one function to pick; calls without
-- p_branch_id keep working through the default. The brand body is the one
-- from 20261001000000, unchanged.
DROP FUNCTION IF EXISTS "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date");
CREATE OR REPLACE FUNCTION "public"."get_dashboard_summary"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date",
    "p_prev_period_start" "date",
    "p_prev_period_end" "date",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  IF p_branch_id IS NOT NULL THEN
    RETURN public.branch_dashboard_summary(
      p_store_id, p_branch_id, p_period_start, p_period_end, p_prev_period_start, p_prev_period_end);
  END IF;

  SELECT jsonb_build_object(
    'revenue', COALESCE((SELECT SUM(paid_revenue) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_revenue', COALESCE((SELECT SUM(paid_revenue) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'order_count', COALESCE((SELECT SUM(orders_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_order_count', COALESCE((SELECT SUM(orders_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'order_value_sum', COALESCE((SELECT SUM(order_value_sum) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
    'prev_order_value_sum', COALESCE((SELECT SUM(order_value_sum) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_prev_period_start AND p_prev_period_end), 0),
    'paid_orders_count', COALESCE((SELECT SUM(paid_orders_count) FROM public.dashboard_daily_metrics WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end), 0),
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
ALTER FUNCTION "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date", "uuid") OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date", "uuid") TO "authenticated";

-- 7. Profit & Loss ----------------------------------------------------------------
-- Same figures as 20260926000000; with a branch, every order figure is that
-- branch's orders and expenses are that branch's own.
DROP FUNCTION IF EXISTS "public"."get_profit_loss_report"("uuid", "date", "date");
CREATE OR REPLACE FUNCTION "public"."get_profit_loss_report"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date",
    "p_branch_id" "uuid" DEFAULT NULL
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
  IF NOT public.has_store_permission(p_store_id, 'reports.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  IF p_branch_id IS NULL THEN
    SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
    FROM public.dashboard_daily_metrics
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM public.dashboard_daily_expense_category_summary
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;
  ELSE
    SELECT COALESCE(SUM(paid_revenue), 0) INTO v_total_sales
    FROM public.dashboard_branch_daily_metrics
    WHERE store_id = p_store_id AND branch_id = p_branch_id AND summary_date BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM public.expenses
    WHERE store_id = p_store_id AND branch_id = p_branch_id AND expense_date BETWEEN p_period_start AND p_period_end;
  END IF;

  SELECT COALESCE(SUM(o.additional_charges), 0) INTO v_additional_charges
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
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
    AND (p_branch_id IS NULL OR o2.branch_id = p_branch_id)
    AND o2.order_date BETWEEN p_period_start AND p_period_end
    AND o2.payment_status = 'paid'
    AND o2.status NOT IN ('cancelled', 'returned');

  v_gross_profit := v_total_sales - v_cogs;

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
    AND (p_branch_id IS NULL OR o3.branch_id = p_branch_id)
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
    'trend', CASE WHEN p_branch_id IS NULL THEN (
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
    ) ELSE (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', d.day,
        'net_profit', COALESCE(m.gross_profit, 0) - COALESCE(e.amount, 0)
      ) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(p_period_start, p_period_end, '1 day') AS d(day)
      LEFT JOIN public.dashboard_branch_daily_metrics m
        ON m.store_id = p_store_id AND m.branch_id = p_branch_id AND m.summary_date = d.day::date
      LEFT JOIN (
        SELECT expense_date, SUM(amount) AS amount
        FROM public.expenses
        WHERE store_id = p_store_id AND branch_id = p_branch_id
          AND expense_date BETWEEN p_period_start AND p_period_end
        GROUP BY expense_date
      ) e ON e.expense_date = d.day::date
    ) END
  ) INTO v_result;

  RETURN v_result;
END;
$$;
ALTER FUNCTION "public"."get_profit_loss_report"("uuid", "date", "date", "uuid") OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_profit_loss_report"("uuid", "date", "date", "uuid") TO "authenticated";

-- 8. Branch comparison ------------------------------------------------------------
-- One row per branch the caller can see: orders, paid sales, gross profit,
-- expenses and net for the period, plus what's still owed right now
-- (customer due and COD the couriers still hold). Vendor profit is added by
-- the app (it's computed from vendor payments there).
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
           SUM(orders_count) AS orders_count,
           SUM(paid_revenue) AS sales,
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
  ),
  -- Per customer and branch: open order totals minus payments made against
  -- them or on account at that branch (the same money the waterfall in
  -- customerDueMath.ts spreads over those orders).
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

REVOKE ALL ON FUNCTION "public"."backfill_store_money_branches"("uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."backfill_store_money_branches"("uuid") TO "service_role";
