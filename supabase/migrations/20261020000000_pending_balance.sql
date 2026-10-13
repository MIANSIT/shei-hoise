-- Pending Amount: everything still unpaid right now, counted once.
--
-- The dashboard's Pending Amount added up each pending order's total on its
-- order date: it ignored partial payments, left out shipping while Customer
-- Dues counts it, and never changed when a due was collected later. This is a
-- live balance instead, for the whole store or one branch:
--   customer_due = what customers owe the shop directly (Quick Sale / due
--                  sales), after payments — same rule as Customer Dues and
--                  get_branch_comparison.
--   cod_pending  = delivered online COD the courier hasn't handed over yet.
-- pending = customer_due + cod_pending.
--
-- Requires 20261014000000_orders_paid_at.sql.

-- A paid order that was settled out of the customer's payments (Customer Dues)
-- rather than at the sale. It must stay in the due calculation, or the payment
-- that settled it is applied again to the orders still unpaid and hides that
-- due. With paid_at: marked paid more than a minute after it was created.
-- Without paid_at (paid before that column existed): updated within two
-- minutes after one of the customer's payments, which is when recording a
-- payment marks an order paid. Same rule as isLedgerSettledOrder in
-- customerDueMath.ts.
CREATE OR REPLACE FUNCTION "public"."is_ledger_settled_order"(
    "p_store_id" "uuid", "p_customer_id" "uuid", "p_payment_status" "text",
    "p_paid_at" timestamp with time zone, "p_created_at" timestamp with time zone,
    "p_updated_at" timestamp with time zone
) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT p_payment_status = 'paid' AND CASE
    WHEN p_paid_at IS NOT NULL THEN p_paid_at - p_created_at > interval '1 minute'
    ELSE p_updated_at - p_created_at > interval '1 minute'
         AND EXISTS (
           SELECT 1 FROM public.customer_payments cp
           WHERE cp.store_id = p_store_id AND cp.customer_id = p_customer_id
             AND p_updated_at BETWEEN cp.created_at - interval '1 second' AND cp.created_at + interval '2 minutes'
         )
  END;
$$;
ALTER FUNCTION "public"."is_ledger_settled_order"("uuid", "uuid", "text", timestamp with time zone, timestamp with time zone, timestamp with time zone) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_pending_balance"(
    "p_store_id" "uuid",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_due numeric;
  v_cod numeric;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  WITH open_orders AS (
    SELECT o.id, o.branch_id, o.customer_id, o.total_amount
    FROM public.orders o
    WHERE o.store_id = p_store_id
      AND o.customer_id IS NOT NULL
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND o.payment_status <> 'refunded'
      -- Paid later out of the customer's payments: still part of that balance.
      AND (
        o.payment_status <> 'paid'
        OR public.is_ledger_settled_order(o.store_id, o.customer_id, o.payment_status, o.paid_at, o.created_at, o.updated_at)
      )
      AND o.status NOT IN ('cancelled', 'returned')
      -- Online COD is the courier's to hand over — it's under COD pending.
      AND NOT (o.payment_method = 'cod' AND o.channel IS DISTINCT FROM 'pos')
  )
  SELECT COALESCE(SUM(GREATEST(x.owed - x.paid, 0)), 0) INTO v_due
  FROM (
    SELECT oo.branch_id, oo.customer_id,
           SUM(oo.total_amount) AS owed,
           COALESCE((
             SELECT SUM(cp.amount) FROM public.customer_payments cp
             WHERE cp.store_id = p_store_id AND cp.customer_id = oo.customer_id
               AND (cp.order_id IN (SELECT id FROM open_orders
                                    WHERE branch_id IS NOT DISTINCT FROM oo.branch_id AND customer_id = oo.customer_id)
                    OR (cp.order_id IS NULL AND cp.branch_id IS NOT DISTINCT FROM oo.branch_id))
           ), 0) AS paid
    FROM open_orders oo
    GROUP BY oo.branch_id, oo.customer_id
  ) x
  -- Only dues that still have an unpaid order behind them.
  WHERE EXISTS (
    SELECT 1 FROM public.orders u
    WHERE u.store_id = p_store_id AND u.customer_id = x.customer_id
      AND u.branch_id IS NOT DISTINCT FROM x.branch_id
      AND u.payment_status NOT IN ('paid', 'refunded')
      AND u.status NOT IN ('cancelled', 'returned')
      AND NOT (u.payment_method = 'cod' AND u.channel IS DISTINCT FROM 'pos')
  );

  SELECT COALESCE(SUM(o.total_amount), 0) INTO v_cod
  FROM public.orders o
  WHERE o.store_id = p_store_id
    AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
    AND o.payment_method = 'cod' AND o.status = 'delivered' AND o.channel <> 'pos'
    AND o.cod_settlement_id IS NULL AND o.payment_status <> 'paid';

  RETURN jsonb_build_object('customer_due', v_due, 'cod_pending', v_cod, 'pending', v_due + v_cod);
END;
$$;
ALTER FUNCTION "public"."get_pending_balance"("uuid", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_pending_balance"("uuid", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_pending_balance"("uuid", "uuid") TO "authenticated";
