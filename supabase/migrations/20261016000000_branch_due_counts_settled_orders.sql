-- Branch comparison "customer due": keep orders the ledger already settled.
--
-- A customer payment not tied to an order (e.g. one lump sum) pays the oldest
-- orders first and marks them paid. The due was then worked out from unpaid
-- orders only, so the same payment was applied again to the orders still
-- unpaid and hid their due (a branch showed 0 due while the customer still
-- owed it). Orders marked paid more than a minute after they were created
-- were settled that way, so they stay in the calculation; orders paid at the
-- counter never used the ledger and stay out. Same rule as
-- isLedgerSettledOrder in customerDueMath.ts.
--
-- Body is 20261008000000's get_branch_comparison with only open_orders changed.
-- Requires 20261014000000_orders_paid_at.sql.

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
      AND o.payment_status <> 'refunded'
      AND (
        o.payment_status <> 'paid'
        OR (o.paid_at IS NOT NULL AND o.paid_at - o.created_at > interval '1 minute')
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
