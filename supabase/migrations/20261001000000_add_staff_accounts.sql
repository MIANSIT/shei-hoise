-- Staff logins and role permissions (plan feature key: staff_accounts,
-- plan limit key: max_staff).
--
-- Adds a fourth kind of dashboard user, 'store_staff'. A staff member has a
-- users row with store_id set (so every existing getAuthenticatedStoreId()
-- server action resolves the right store for them) plus a store_staff row
-- linking them to an owner-defined store_roles row whose permissions[] lists
-- exactly what they may do ('orders.view', 'orders.delete', ...).
--
-- Because staff now carry users.store_id, every RLS policy and RPC check
-- that said "allow if store_id = the caller's users.store_id" would hand a
-- Cashier the whole store (cost prices, vendors, P&L). Those checks are
-- rewritten below to go through has_store_permission(), which allows the
-- store owner always and staff only for the permission named.
--
-- All three new tables carry store_id and are service-role only (RLS on,
-- no policies): staff and roles are read and written through "use server"
-- actions that check permissions first, and the activity log is written
-- only by server code.

-- 1. New user type --------------------------------------------------------
ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS "users_user_type_check";
ALTER TABLE "public"."users" ADD CONSTRAINT "users_user_type_check" CHECK (
  ("user_type")::"text" = ANY (ARRAY['super_admin'::"text", 'store_owner'::"text", 'customer'::"text", 'store_staff'::"text"])
);

-- 2. Roles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."store_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL,
    "description" "text",
    -- e.g. {'orders.view','orders.add','pos.discount'}; see src/lib/permissions/catalog.ts
    "permissions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    -- e.g. {"max_discount_amount": 200, "cancel_statuses": ["pending"]}; empty = no limits
    "limits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    -- Ready-made roles seeded for every store; editable, but not deletable
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "store_roles_store_name_key" ON "public"."store_roles" ("store_id", lower("name"));

-- 3. Staff ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."store_staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "user_id" "uuid" NOT NULL UNIQUE REFERENCES "public"."users"("id") ON DELETE CASCADE,
    -- Full login name, "<store_slug>.<name>", lowercase, unique platform-wide.
    -- The auth email behind it is "<username>@staff.sheihoise.internal".
    "username" "text" NOT NULL UNIQUE,
    "display_name" "text" NOT NULL,
    "phone" "text",
    "role_id" "uuid" NOT NULL REFERENCES "public"."store_roles"("id") ON DELETE RESTRICT,
    -- Branch scoping, used once multi-branch ships. all_branches = true until then.
    "all_branches" boolean DEFAULT true NOT NULL,
    "branch_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "must_change_password" boolean DEFAULT true NOT NULL,
    "failed_login_count" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "deactivated_at" timestamp with time zone,
    "created_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
CREATE INDEX IF NOT EXISTS "store_staff_store_id_idx" ON "public"."store_staff" ("store_id");
CREATE INDEX IF NOT EXISTS "store_staff_role_id_idx" ON "public"."store_staff" ("role_id");

-- 4. Activity log (append-only) ------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."store_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "store_id" "uuid" NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    -- null = not a known user (e.g. a failed login for an unknown username)
    "user_id" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    -- Snapshot of who it was at the time, so the row still reads correctly
    -- after the person is renamed, re-roled or removed.
    "actor_name" "text",
    "actor_role" "text",
    "branch_id" "uuid",
    -- 'auth.login', 'auth.login_failed', 'orders.delete', 'staff.create', ...
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "summary" "text",
    -- before/after values, or a full copy of a deleted record
    "details" "jsonb",
    "ip" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
CREATE INDEX IF NOT EXISTS "store_activity_log_store_created_idx" ON "public"."store_activity_log" ("store_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_activity_log_user_idx" ON "public"."store_activity_log" ("user_id", "created_at" DESC);

CREATE OR REPLACE FUNCTION "public"."trg_store_activity_log_no_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'store_activity_log is append-only';
END;
$$;
DROP TRIGGER IF EXISTS "store_activity_log_no_update" ON "public"."store_activity_log";
CREATE TRIGGER "store_activity_log_no_update" BEFORE UPDATE ON "public"."store_activity_log"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_store_activity_log_no_update"();

-- Service-role only: RLS on, no policies.
ALTER TABLE "public"."store_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."store_staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."store_activity_log" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."store_roles" TO "service_role";
GRANT ALL ON TABLE "public"."store_staff" TO "service_role";
GRANT ALL ON TABLE "public"."store_activity_log" TO "service_role";

-- 5. Permission helpers ---------------------------------------------------
-- Mirrors hasFeature() in src/lib/utils/planFeatures.ts: the store's latest
-- subscription must be active/trialing and its plan must set the key true.
CREATE OR REPLACE FUNCTION "public"."store_has_feature"("p_store_id" "uuid", "p_feature" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE((
    SELECT ss.status IN ('active', 'trialing') AND (sp.features ->> p_feature) = 'true'
    FROM public.store_subscriptions ss
    LEFT JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.store_id = p_store_id
    ORDER BY ss.created_at DESC
    LIMIT 1
  ), false);
$$;

-- True for the store's owner (always), or for an active staff member of
-- that store whose role grants p_permission while the store's plan still
-- has staff_accounts. Mirrors requirePermission() in
-- src/lib/permissions/server.ts.
CREATE OR REPLACE FUNCTION "public"."has_store_permission"("p_store_id" "uuid", "p_permission" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.store_id = p_store_id AND u.user_type = 'store_owner'
  ) OR (
    EXISTS (
      SELECT 1
      FROM public.store_staff s
      JOIN public.store_roles r ON r.id = s.role_id
      WHERE s.user_id = auth.uid()
        AND s.store_id = p_store_id
        AND s.is_active
        AND p_permission = ANY (r.permissions)
    )
    AND public.store_has_feature(p_store_id, 'staff_accounts')
  );
$$;
-- Ends every session a user has (force logout, deactivation, password
-- reset). Deleting auth.sessions cascades to their refresh tokens, and
-- GoTrue rejects access tokens whose session no longer exists, so
-- auth.getUser() fails on the next request. Service role only.
CREATE OR REPLACE FUNCTION "public"."revoke_user_sessions"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
$$;
REVOKE ALL ON FUNCTION "public"."revoke_user_sessions"("uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."revoke_user_sessions"("uuid") TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."store_has_feature"("uuid", "text") TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."has_store_permission"("uuid", "text") TO "authenticated", "service_role";

-- 6. Rewrite owner-read policies -----------------------------------------
-- Previously "store_id IN (caller's users.store_id)", which also matched
-- customers (they carry users.store_id too) and would match staff.
DROP POLICY IF EXISTS "vendors_owner_select" ON "public"."vendors";
CREATE POLICY "vendors_owner_select" ON "public"."vendors" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'vendors.view'));

DROP POLICY IF EXISTS "vendor_stock_owner_select" ON "public"."vendor_stock";
CREATE POLICY "vendor_stock_owner_select" ON "public"."vendor_stock" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'vendors.view'));

DROP POLICY IF EXISTS "vendor_orders_owner_select" ON "public"."vendor_orders";
CREATE POLICY "vendor_orders_owner_select" ON "public"."vendor_orders" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'vendors.view'));

DROP POLICY IF EXISTS "vendor_settlements_owner_select" ON "public"."vendor_settlements";
CREATE POLICY "vendor_settlements_owner_select" ON "public"."vendor_settlements" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'vendors.view'));

DROP POLICY IF EXISTS "vendor_payments_owner_select" ON "public"."vendor_payments";
CREATE POLICY "vendor_payments_owner_select" ON "public"."vendor_payments" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'vendors.view'));

DROP POLICY IF EXISTS "vendor_order_items_owner_select" ON "public"."vendor_order_items";
CREATE POLICY "vendor_order_items_owner_select" ON "public"."vendor_order_items" FOR SELECT TO "authenticated" USING (
  "vendor_order_id" IN (
    SELECT "vo"."id" FROM "public"."vendor_orders" "vo"
    WHERE "public"."has_store_permission"("vo"."store_id", 'vendors.view')
  )
);

DROP POLICY IF EXISTS "vendor_settlement_items_owner_select" ON "public"."vendor_settlement_items";
CREATE POLICY "vendor_settlement_items_owner_select" ON "public"."vendor_settlement_items" FOR SELECT TO "authenticated" USING (
  "settlement_id" IN (
    SELECT "vs"."id" FROM "public"."vendor_settlements" "vs"
    WHERE "public"."has_store_permission"("vs"."store_id", 'vendors.view')
  )
);

DROP POLICY IF EXISTS "vendor_stock_movements_owner_select" ON "public"."vendor_stock_movements";
CREATE POLICY "vendor_stock_movements_owner_select" ON "public"."vendor_stock_movements" FOR SELECT TO "authenticated" USING (
  "vendor_id" IN (
    SELECT "v"."id" FROM "public"."vendors" "v"
    WHERE "public"."has_store_permission"("v"."store_id", 'vendors.view')
  )
);

DROP POLICY IF EXISTS "coupons_owner_select" ON "public"."coupons";
CREATE POLICY "coupons_owner_select" ON "public"."coupons" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'coupons.view'));

DROP POLICY IF EXISTS "coupon_redemptions_owner_select" ON "public"."coupon_redemptions";
CREATE POLICY "coupon_redemptions_owner_select" ON "public"."coupon_redemptions" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'coupons.view'));

-- Payments are read by Customer Dues, the order list (Collect payment),
-- Register Audit and COD Settlements, so any of those areas can see them.
DROP POLICY IF EXISTS "customer_payments_owner_select" ON "public"."customer_payments";
CREATE POLICY "customer_payments_owner_select" ON "public"."customer_payments" FOR SELECT TO "authenticated" USING (
  "public"."has_store_permission"("store_id", 'customers.view')
  OR "public"."has_store_permission"("store_id", 'orders.view')
  OR "public"."has_store_permission"("store_id", 'register.view')
  OR "public"."has_store_permission"("store_id", 'cod.view')
);

DROP POLICY IF EXISTS "order_delivery_costs_owner_select" ON "public"."order_delivery_costs";
CREATE POLICY "order_delivery_costs_owner_select" ON "public"."order_delivery_costs" FOR SELECT TO "authenticated" USING (
  "public"."has_store_permission"("store_id", 'orders.view')
  OR "public"."has_store_permission"("store_id", 'cod.view')
);

-- 7. RPC authorization ----------------------------------------------------
-- Same bodies as 20260910000002 (get_dashboard_summary) and 20260926000000
-- (get_profit_loss_report); only the opening authorization check changes.
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
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
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
ALTER FUNCTION "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date") OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_dashboard_summary"("uuid", "date", "date", "date", "date") TO "authenticated";

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
  IF NOT public.has_store_permission(p_store_id, 'reports.view') THEN
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
