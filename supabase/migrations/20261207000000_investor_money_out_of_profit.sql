-- Investor money never changes sales or profit.
--
--   * Loan interest gets its own investor entry type, 'interest': it lowers the Investor account and is not an expense.
--   * An expense paid from the Investor account (paid_from = 'outside') no longer counts in profit. It stays on the
--     Expense page and still lowers that person's Investor account.
--
-- Every function below is the latest version with one change: expenses paid from the Investor account are left out.
-- Months already closed keep their saved figures.
--
-- Requires 20261201000000_investor_money.sql and 20261117000000_profit_missing_tp.sql.

ALTER TABLE "public"."investor_entries" DROP CONSTRAINT IF EXISTS "investor_entries_type_check";
ALTER TABLE ONLY "public"."investor_entries"
  ADD CONSTRAINT "investor_entries_type_check" CHECK ("entry_type" IN ('put_in', 'repay', 'pay_back', 'profit_share_paid', 'interest'));

-- From 20260719000004_add_dashboard_order_expense_triggers.sql.
CREATE OR REPLACE FUNCTION "public"."recompute_dashboard_expense_category_summary"(
    "p_store_id" "uuid", "p_summary_date" "date", "p_category_id" "uuid"
) RETURNS void
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses
    WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND expense_date = p_summary_date AND category_id = p_category_id
  ) THEN
    DELETE FROM public.dashboard_daily_expense_category_summary
      WHERE store_id = p_store_id AND summary_date = p_summary_date AND category_id = p_category_id;
    RETURN;
  END IF;

  INSERT INTO public.dashboard_daily_expense_category_summary (store_id, summary_date, category_id, amount, expense_count, updated_at)
  SELECT p_store_id, p_summary_date, p_category_id, SUM(amount), COUNT(*), now()
  FROM public.expenses
  WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND expense_date = p_summary_date AND category_id = p_category_id
  ON CONFLICT (store_id, summary_date, category_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    expense_count = EXCLUDED.expense_count,
    updated_at = now();
END;
$$;

-- From 20261004000000_add_branch_money.sql.
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
    SELECT * FROM public.expenses WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id
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

-- From 20261004000000_add_branch_money.sql.
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
    WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id AND expense_date BETWEEN p_period_start AND p_period_end;
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
        WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id
          AND expense_date BETWEEN p_period_start AND p_period_end
        GROUP BY expense_date
      ) e ON e.expense_date = d.day::date
    ) END
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- From 20261021000000_branch_due_settled_by_payment.sql.
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
    WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND expense_date BETWEEN p_period_start AND p_period_end
    GROUP BY branch_id
  ),
  open_orders AS (
    SELECT o.id, o.branch_id, o.customer_id, o.total_amount
    FROM public.orders o
    WHERE o.store_id = p_store_id AND o.branch_id IS NOT NULL AND o.customer_id IS NOT NULL
      AND o.payment_status <> 'refunded'
      AND (
        o.payment_status <> 'paid'
        OR public.is_ledger_settled_order(o.store_id, o.customer_id, o.payment_status, o.paid_at, o.created_at, o.updated_at)
      )
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
    -- Only dues that still have an unpaid order behind them.
    WHERE EXISTS (
      SELECT 1 FROM public.orders u
      WHERE u.store_id = p_store_id AND u.customer_id = x.customer_id AND u.branch_id = x.branch_id
        AND u.payment_status NOT IN ('paid', 'refunded')
        AND u.status NOT IN ('cancelled', 'returned')
        AND NOT (u.payment_method = 'cod' AND u.channel IS DISTINCT FROM 'pos')
    )
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

-- From 20261117000000_profit_missing_tp.sql.
CREATE OR REPLACE FUNCTION "public"."get_profit_loss_accrual"(
    "p_store_id" "uuid",
    "p_period_start" "date",
    "p_period_end" "date",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_days jsonb;
  v_revenue numeric;
  v_collected numeric;
  v_orders integer;
  v_cogs numeric;
  v_delivery numeric;
  v_expenses numeric;
  v_trend jsonb;
  v_miss_n integer;
  v_miss_sales numeric;
BEGIN
  IF NOT (
    public.has_store_permission(p_store_id, 'dashboard.view')
    OR public.has_store_permission(p_store_id, 'reports.view')
  ) THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  -- One pass over the period's orders, summed per day.
  WITH ord AS (
    SELECT o.id,
           o.order_date AS d,
           COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0) + COALESCE(o.additional_charges, 0) AS rev,
           (o.payment_status = 'paid') AS is_paid,
           -- Courier cost minus what the customer was charged (negative = delivery earns money).
           COALESCE(lc.amount, o.shipping_fee, 0) - COALESCE(o.shipping_fee, 0) AS dnet,
           COALESCE((
             SELECT SUM(COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0), 0) * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
           ), 0) AS cost,
           -- Lines sold with no cost anywhere (cost saved on the line, variant TP, product TP all empty or 0).
           COALESCE((
             SELECT COUNT(*)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
               AND COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0)) IS NULL
           ), 0) AS miss_n,
           COALESCE((
             SELECT SUM(oi.unit_price * oi.quantity)
             FROM public.order_items oi
             LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN public.products p2 ON p2.id = oi.product_id
             WHERE oi.order_id = o.id
               AND COALESCE(NULLIF(oi.cost_price, 0), NULLIF(pv.tp_price, 0), NULLIF(p2.tp_price, 0)) IS NULL
           ), 0) AS miss_sales
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT odc.amount
      FROM public.order_delivery_costs odc
      WHERE odc.order_id = o.id
      ORDER BY odc.created_at DESC
      LIMIT 1
    ) lc ON true
    WHERE o.store_id = p_store_id
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND o.order_date BETWEEN p_period_start AND p_period_end
      AND o.status NOT IN ('cancelled', 'returned')
  ),
  day AS (
    SELECT d,
           SUM(rev) AS rev,
           SUM(rev) FILTER (WHERE is_paid) AS rev_paid,
           SUM(cost) AS cost,
           SUM(dnet) AS dnet,
           SUM(miss_n) AS miss_n,
           SUM(miss_sales) AS miss_sales,
           COUNT(*) AS n
    FROM ord GROUP BY d
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'd', d, 'rev', rev, 'rev_paid', COALESCE(rev_paid, 0), 'cost', cost, 'dnet', dnet, 'n', n,
           'miss_n', miss_n, 'miss_sales', miss_sales)), '[]'::jsonb)
    INTO v_days
  FROM day;

  SELECT COALESCE(SUM(x.rev), 0), COALESCE(SUM(x.rev_paid), 0), COALESCE(SUM(x.n), 0),
         COALESCE(SUM(x.cost), 0), COALESCE(SUM(x.dnet), 0),
         COALESCE(SUM(x.miss_n), 0), COALESCE(SUM(x.miss_sales), 0)
    INTO v_revenue, v_collected, v_orders, v_cogs, v_delivery, v_miss_n, v_miss_sales
  FROM jsonb_to_recordset(v_days) AS x(d date, rev numeric, rev_paid numeric, cost numeric, dnet numeric, n integer, miss_n integer, miss_sales numeric);

  -- Expenses: same sources as the existing dashboard and report.
  IF p_branch_id IS NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM public.dashboard_daily_expense_category_summary
    WHERE store_id = p_store_id AND summary_date BETWEEN p_period_start AND p_period_end;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM public.expenses
    WHERE paid_from IS DISTINCT FROM 'outside' AND store_id = p_store_id AND branch_id = p_branch_id
      AND expense_date BETWEEN p_period_start AND p_period_end;
  END IF;

  -- Daily net profit; its points add up to the headline net profit.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'date', g.day::date,
           'net_profit', COALESCE(t.rev, 0) - COALESCE(t.cost, 0) - COALESCE(t.dnet, 0) - COALESCE(e.amount, 0)
         ) ORDER BY g.day), '[]'::jsonb)
    INTO v_trend
  FROM generate_series(p_period_start, p_period_end, '1 day') AS g(day)
  LEFT JOIN jsonb_to_recordset(v_days) AS t(d date, rev numeric, rev_paid numeric, cost numeric, dnet numeric, n integer, miss_n integer, miss_sales numeric)
    ON t.d = g.day::date
  LEFT JOIN (
    SELECT es.day, SUM(es.amount) AS amount FROM (
      SELECT summary_date AS day, amount
      FROM public.dashboard_daily_expense_category_summary
      WHERE p_branch_id IS NULL AND store_id = p_store_id
        AND summary_date BETWEEN p_period_start AND p_period_end
      UNION ALL
      SELECT expense_date AS day, amount
      FROM public.expenses
      WHERE paid_from IS DISTINCT FROM 'outside' AND p_branch_id IS NOT NULL AND store_id = p_store_id AND branch_id = p_branch_id
        AND expense_date BETWEEN p_period_start AND p_period_end
    ) es GROUP BY es.day
  ) e ON e.day = g.day::date;

  RETURN jsonb_build_object(
    'net_revenue', v_revenue,
    'collected', v_collected,
    'uncollected', v_revenue - v_collected,
    'orders_count', v_orders,
    'cogs', v_cogs,
    'gross_profit', v_revenue - v_cogs,
    'total_expenses', v_expenses,
    'delivery_net_cost', v_delivery,
    'net_profit', v_revenue - v_cogs - v_expenses - v_delivery,
    'missing_cost_lines', v_miss_n,
    'missing_cost_sales', v_miss_sales,
    'trend', v_trend
  );
END;
$$;

-- Take expenses already paid from the Investor account out of the daily totals.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT store_id, expense_date AS d, category_id FROM public.expenses WHERE paid_from = 'outside'
  LOOP
    PERFORM public.recompute_dashboard_expense_category_summary(r.store_id, r.d, r.category_id);
  END LOOP;
END $$;
