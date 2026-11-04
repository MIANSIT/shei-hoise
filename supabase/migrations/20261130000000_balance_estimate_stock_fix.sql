-- Fix: the stock of a past day now counts what orders took.
--
-- get_balance_estimate (20261128) worked out a past day's stock as the stock now less the stock_movements
-- after that day. But orders take stock when they are placed and give it back when they are cancelled or
-- returned WITHOUT writing a stock_movements row, so every sale after the day was missed and the stock of
-- that day came out too low. This adds the effect of orders:
--   * an order placed after the day and still active: its units were still in stock on the day (added back);
--   * an order placed by the day and cancelled or returned after it (known only when the history was
--     running): its units were out of stock on the day (taken off).
-- Known limit: a bundle order's lines are the bundle, not its components, so the components' stock for
-- bundle orders is not counted here.
-- Same name and arguments as before; read-only. Requires 20261128000000_balance_history_records.sql.

-- The balance for a past day ----------------------------------------------------
-- Same name and arguments as in 20261127. Also returns "from_history": true when the day is on or after the
-- moment the history started, so dues, courier cash and stock value come from the records of that day.
CREATE OR REPLACE FUNCTION "public"."get_balance_estimate"(
    "p_store_id" "uuid",
    "p_branch_id" "uuid",
    "p_date" "date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  -- Midnight at the end of p_date in Dhaka: anything at or after this is "after the day".
  v_end timestamptz := ((p_date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka');
  v_started timestamptz;
  v_hist boolean := false;
  v_inv_cost numeric := 0;
  v_inv_sell numeric := 0;
  v_units numeric := 0;
  v_no_cost integer := 0;
  v_due numeric := 0;
  v_cod numeric := 0;
  v_payable numeric := NULL;
  v_advance numeric := NULL;
  v_vendor numeric := 0;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  -- Was the history running at the end of that day?
  SELECT MIN(h.changed_at) INTO v_started
  FROM public.order_status_history h
  WHERE h.store_id = p_store_id AND h.source = 'baseline';
  v_hist := v_started IS NOT NULL AND v_started < v_end;

  -- Inventory: stock now, less the changes after the day (stock movements, and what orders took or gave back); cost and price as they were on the day.
  WITH moved AS (
    SELECT sm.product_id, sm.variant_id, SUM(sm.delta) AS after_delta
    FROM public.stock_movements sm
    JOIN public.products mp ON mp.id = sm.product_id AND mp.store_id = p_store_id
    WHERE sm.created_at >= v_end
      AND (p_branch_id IS NULL OR sm.branch_id = p_branch_id)
    GROUP BY sm.product_id, sm.variant_id
  ),
  -- Orders take stock when they are placed and give it back when they are cancelled or returned, but those
  -- changes are not in stock_movements. Change in available stock after the day caused by orders:
  --   an order placed after the day and still active took stock after the day (minus);
  --   an order placed by the day that was cancelled or returned after it gave stock back after the day (plus;
  --   only known when the history was running, because before it the date of the cancellation is not recorded).
  order_effect AS (
    SELECT oi.product_id, oi.variant_id,
           SUM(CASE
                 WHEN o.created_at >= v_end AND o.status NOT IN ('cancelled', 'returned') THEN -oi.quantity
                 WHEN o.created_at < v_end AND o.status IN ('cancelled', 'returned')
                      AND v_hist AND COALESCE(st.status, 'pending') NOT IN ('cancelled', 'returned') THEN oi.quantity
                 ELSE 0
               END) AS after_delta
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    LEFT JOIN LATERAL (
      SELECT h.status FROM public.order_status_history h
      WHERE v_hist AND h.order_id = o.id AND h.changed_at < v_end
      ORDER BY h.changed_at DESC LIMIT 1
    ) st ON true
    WHERE o.store_id = p_store_id
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND (o.created_at >= v_end OR (v_hist AND o.status IN ('cancelled', 'returned')))
    GROUP BY oi.product_id, oi.variant_id
  ),
  lines AS (
    SELECT GREATEST(
             (CASE WHEN p_branch_id IS NULL THEN pi.quantity_available ELSE COALESCE(bi.quantity_available, 0) END)
             - COALESCE(mv.after_delta, 0) - COALESCE(oe.after_delta, 0), 0) AS qa,
           CASE WHEN pi.variant_id IS NOT NULL
                THEN COALESCE(NULLIF(vh.discounted_price, 0), vh.base_price, NULLIF(v.discounted_price, 0), v.base_price)
                ELSE COALESCE(NULLIF(ph.discounted_price, 0), ph.base_price, NULLIF(p.discounted_price, 0), p.base_price) END AS price,
           CASE WHEN pi.variant_id IS NOT NULL
                THEN COALESCE(CASE WHEN v_hist THEN vh.tp_price END, pc.cost_after, v.tp_price, p.tp_price)
                ELSE COALESCE(CASE WHEN v_hist THEN ph.tp_price END, pc.cost_after, p.tp_price) END AS cost
    FROM public.products p
    JOIN public.product_inventory pi ON pi.product_id = p.id
    LEFT JOIN public.product_variants v ON v.id = pi.variant_id
    LEFT JOIN public.branch_inventory bi
      ON p_branch_id IS NOT NULL
     AND bi.branch_id = p_branch_id AND bi.product_id = p.id
     AND bi.variant_id IS NOT DISTINCT FROM pi.variant_id
    LEFT JOIN moved mv ON mv.product_id = p.id AND mv.variant_id IS NOT DISTINCT FROM pi.variant_id
    LEFT JOIN order_effect oe ON oe.product_id = p.id AND oe.variant_id IS NOT DISTINCT FROM pi.variant_id
    -- The recorded cost and price on that day (only when the history was running).
    LEFT JOIN LATERAL (
      SELECT h.tp_price, h.base_price, h.discounted_price FROM public.product_cost_history h
      WHERE v_hist AND h.product_id = p.id AND h.variant_id IS NULL AND h.changed_at < v_end
      ORDER BY h.changed_at DESC LIMIT 1
    ) ph ON true
    LEFT JOIN LATERAL (
      SELECT h.tp_price, h.base_price, h.discounted_price FROM public.product_cost_history h
      WHERE v_hist AND h.variant_id = pi.variant_id AND h.changed_at < v_end
      ORDER BY h.changed_at DESC LIMIT 1
    ) vh ON true
    -- Before the history: the cost of the last purchase received by that day.
    LEFT JOIN LATERAL (
      SELECT pit.cost_after
      FROM public.purchase_items pit
      JOIN public.purchases pu ON pu.id = pit.purchase_id
      WHERE NOT v_hist AND pit.product_id = p.id AND pit.variant_id IS NOT DISTINCT FROM pi.variant_id
        AND pu.status = 'received' AND pu.received_at < v_end AND pit.cost_after IS NOT NULL
      ORDER BY pu.received_at DESC LIMIT 1
    ) pc ON true
    WHERE p.store_id = p_store_id
      AND pi.track_inventory IS NOT FALSE
      AND (
        (pi.variant_id IS NOT NULL AND v.is_active IS NOT FALSE)
        OR (pi.variant_id IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.product_variants v2 WHERE v2.product_id = p.id AND v2.is_active IS NOT FALSE))
      )
  )
  SELECT COALESCE(SUM(qa * COALESCE(cost, 0)), 0),
         COALESCE(SUM(qa * COALESCE(price, 0)), 0),
         COALESCE(SUM(qa), 0),
         COUNT(*) FILTER (WHERE qa > 0 AND COALESCE(cost, 0) = 0)
    INTO v_inv_cost, v_inv_sell, v_units, v_no_cost
  FROM lines;

  -- Customer dues: orders up to the day, less payments up to the day, per customer and branch.
  -- With the history, an order's status and payment status are the ones it had at the end of that day.
  WITH open_orders AS (
    SELECT o.id, o.branch_id, o.customer_id, o.total_amount
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT h.status, h.payment_status FROM public.order_status_history h
      WHERE v_hist AND h.order_id = o.id AND h.changed_at < v_end
      ORDER BY h.changed_at DESC LIMIT 1
    ) st ON true
    WHERE o.store_id = p_store_id
      AND o.customer_id IS NOT NULL
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND o.order_date <= p_date
      AND COALESCE(st.payment_status, o.payment_status) <> 'refunded'
      AND NOT (o.payment_method = 'cod' AND o.channel IS DISTINCT FROM 'pos')
      AND (
        CASE WHEN v_hist
             THEN COALESCE(st.status, o.status) NOT IN ('cancelled', 'returned')
             -- Before the history: an order cancelled or returned after the day was still owed then.
             ELSE (o.status NOT IN ('cancelled', 'returned') OR o.updated_at >= v_end) END
      )
      -- Not paid at the sale: unpaid then, or marked paid only after the day, or paid later out of the customer's payments.
      AND (
        COALESCE(st.payment_status, o.payment_status) <> 'paid'
        OR (NOT v_hist AND o.paid_at IS NOT NULL AND o.paid_at >= v_end)
        OR public.is_ledger_settled_order(o.store_id, o.customer_id, o.payment_status, o.paid_at, o.created_at, o.updated_at)
      )
  )
  SELECT COALESCE(SUM(GREATEST(x.owed - x.paid, 0)), 0) INTO v_due
  FROM (
    SELECT oo.branch_id, oo.customer_id,
           SUM(oo.total_amount) AS owed,
           COALESCE((
             SELECT SUM(cp.amount) FROM public.customer_payments cp
             WHERE cp.store_id = p_store_id AND cp.customer_id = oo.customer_id
               AND cp.payment_date <= p_date
               AND (cp.order_id IN (SELECT id FROM open_orders
                                    WHERE branch_id IS NOT DISTINCT FROM oo.branch_id AND customer_id = oo.customer_id)
                    OR (cp.order_id IS NULL AND cp.branch_id IS NOT DISTINCT FROM oo.branch_id))
           ), 0) AS paid
    FROM open_orders oo
    GROUP BY oo.branch_id, oo.customer_id
  ) x;

  -- COD cash with couriers: COD orders delivered by the end of the day and not in a settlement on or before it.
  SELECT COALESCE(SUM(o.total_amount), 0) INTO v_cod
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT h.status, h.payment_status FROM public.order_status_history h
    WHERE v_hist AND h.order_id = o.id AND h.changed_at < v_end
    ORDER BY h.changed_at DESC LIMIT 1
  ) st ON true
  WHERE o.store_id = p_store_id
    AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
    AND o.payment_method = 'cod' AND o.channel <> 'pos'
    AND o.order_date <= p_date
    AND (CASE WHEN v_hist THEN st.status = 'delivered' ELSE o.status = 'delivered' END)
    AND (CASE WHEN v_hist THEN COALESCE(st.payment_status, o.payment_status) <> 'paid'
              ELSE (o.payment_status <> 'paid' OR (o.paid_at IS NOT NULL AND o.paid_at >= v_end)) END)
    AND (
      o.cod_settlement_id IS NULL
      OR EXISTS (SELECT 1 FROM public.store_cod_settlements s WHERE s.id = o.cod_settlement_id AND s.settlement_date > p_date)
    );

  -- Supplier bills (store-wide, like the live balance): each supplier on its own, up to the day.
  IF public.has_store_permission(p_store_id, 'stock.supplier_money') THEN
    BEGIN
      SELECT COALESCE(SUM(GREATEST(s.bal, 0)), 0), COALESCE(SUM(GREATEST(-s.bal, 0)), 0)
        INTO v_payable, v_advance
      FROM (
        SELECT SUM(CASE WHEN kind = 'bill' THEN amount ELSE -amount END) AS bal
        FROM public.supplier_ledger
        WHERE store_id = p_store_id AND entry_date <= p_date
        GROUP BY supplier_id
      ) s;
    EXCEPTION WHEN undefined_table THEN
      v_payable := NULL;
      v_advance := NULL;
    END;
  END IF;

  -- What vendors owed, for the whole store or one branch: goods and delivery dispatched up to the day,
  -- less goods handed back and payments received up to the day.
  BEGIN
    SELECT
      COALESCE((
        SELECT SUM(i.quantity * i.vendor_tp)
        FROM public.vendor_order_items i
        JOIN public.vendor_orders vo ON vo.id = i.vendor_order_id
        WHERE vo.store_id = p_store_id AND vo.status = 'confirmed' AND vo.order_date <= p_date
          AND (p_branch_id IS NULL OR vo.branch_id = p_branch_id)
      ), 0)
      + COALESCE((
        SELECT SUM(vo.delivery_cost) FROM public.vendor_orders vo
        WHERE vo.store_id = p_store_id AND vo.status = 'confirmed' AND vo.order_date <= p_date
          AND (p_branch_id IS NULL OR vo.branch_id = p_branch_id)
      ), 0)
      - COALESCE((
        SELECT SUM(si.returned_quantity * si.unit_price)
        FROM public.vendor_settlement_items si
        JOIN public.vendor_settlements vs ON vs.id = si.settlement_id
        WHERE vs.store_id = p_store_id AND vs.settlement_date <= p_date
          AND (p_branch_id IS NULL OR vs.branch_id = p_branch_id)
      ), 0)
      - COALESCE((
        SELECT SUM(vp.amount) FROM public.vendor_payments vp
        WHERE vp.store_id = p_store_id AND vp.payment_date <= p_date
          AND (p_branch_id IS NULL OR vp.branch_id = p_branch_id)
      ), 0)
    INTO v_vendor;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_vendor := 0;
  END;

  RETURN jsonb_build_object(
    'inventory_cost', v_inv_cost,
    'inventory_sell', v_inv_sell,
    'inventory_units', v_units,
    'items_without_cost', v_no_cost,
    'customer_due', v_due,
    'cod_pending', v_cod,
    'accounts_payable', v_payable,
    'supplier_advance', v_advance,
    'vendor_due', GREATEST(v_vendor, 0),
    'from_history', v_hist
  );
END;
$$;
ALTER FUNCTION "public"."get_balance_estimate"("uuid", "uuid", "date") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_balance_estimate"("uuid", "uuid", "date") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_balance_estimate"("uuid", "uuid", "date") TO "authenticated";
