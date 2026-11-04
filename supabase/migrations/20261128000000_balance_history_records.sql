-- Records that make a past day's balance exact, from now on; and a better estimate before that.
--
-- get_balance_estimate (20261127) could not know WHEN an order was delivered, cancelled or marked
-- paid, or what a product's cost and price were on a day, because nothing recorded that. This starts
-- recording it:
--   order_status_history  every change of an order's status or payment status, with the time
--   product_cost_history  every change of a product's or variant's TP, selling price and discount
-- A baseline row per order, product and variant is saved by this migration (the state at the moment
-- it is applied). For any day on or after that moment the balance can be worked out EXACTLY from the
-- records as they stand; for earlier days it stays an estimate, a little better than before:
--   * an order cancelled or returned after the day is still counted as owed when it was last
--     updated after the day;
--   * stock is valued at the cost of the last purchase received by that day, when there is one.
--
-- What vendors owe is now one rule for the whole store and for one branch: goods and delivery
-- dispatched up to the day, less goods handed back and payments received up to the day (the same
-- rule the live Vendors page uses for a branch). It no longer values stock at today's price.
--
-- The history tables are written by triggers and read by the function below; no screen reads them
-- directly (RLS on, no policy). Additive: new tables, triggers and one replaced function.
-- Requires 20261127000000_balance_estimate.sql and 20261020000000_pending_balance.sql.

CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL,
    "order_id" uuid NOT NULL REFERENCES "public"."orders"("id") ON DELETE CASCADE,
    "status" text,
    "payment_status" text,
    "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
    -- 'baseline' = the state when the history started; 'change' = a recorded change.
    "source" text DEFAULT 'change' NOT NULL
);
ALTER TABLE "public"."order_status_history" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "order_status_history_order_idx" ON "public"."order_status_history" ("order_id", "changed_at" DESC);
CREATE INDEX IF NOT EXISTS "order_status_history_store_idx" ON "public"."order_status_history" ("store_id", "source");
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";
ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."product_cost_history" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL,
    "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE CASCADE,
    -- NULL = the product itself, otherwise one of its variants.
    "variant_id" uuid REFERENCES "public"."product_variants"("id") ON DELETE CASCADE,
    "tp_price" numeric(10,2),
    "base_price" numeric(10,2),
    "discounted_price" numeric(10,2),
    "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
    "source" text DEFAULT 'change' NOT NULL
);
ALTER TABLE "public"."product_cost_history" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "product_cost_history_item_idx" ON "public"."product_cost_history" ("product_id", "variant_id", "changed_at" DESC);
CREATE INDEX IF NOT EXISTS "product_cost_history_store_idx" ON "public"."product_cost_history" ("store_id", "source");
GRANT ALL ON TABLE "public"."product_cost_history" TO "service_role";
ALTER TABLE "public"."product_cost_history" ENABLE ROW LEVEL SECURITY;

-- Triggers ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."log_order_status_history"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_status_history (store_id, order_id, status, payment_status)
    VALUES (NEW.store_id, NEW.id, NEW.status, NEW.payment_status);
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."log_order_status_history"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_order_status_history" ON "public"."orders";
CREATE TRIGGER "trg_order_status_history" AFTER INSERT OR UPDATE ON "public"."orders"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_order_status_history"();

CREATE OR REPLACE FUNCTION "public"."log_product_cost_history"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_store uuid;
  v_product uuid;
  v_variant uuid;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    v_store := NEW.store_id; v_product := NEW.id; v_variant := NULL;
  ELSE
    SELECT p.store_id INTO v_store FROM public.products p WHERE p.id = NEW.product_id;
    v_product := NEW.product_id; v_variant := NEW.id;
  END IF;
  IF v_store IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT'
     OR NEW.tp_price IS DISTINCT FROM OLD.tp_price
     OR NEW.base_price IS DISTINCT FROM OLD.base_price
     OR NEW.discounted_price IS DISTINCT FROM OLD.discounted_price THEN
    INSERT INTO public.product_cost_history (store_id, product_id, variant_id, tp_price, base_price, discounted_price)
    VALUES (v_store, v_product, v_variant, NEW.tp_price, NEW.base_price, NEW.discounted_price);
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."log_product_cost_history"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_product_cost_history" ON "public"."products";
CREATE TRIGGER "trg_product_cost_history" AFTER INSERT OR UPDATE ON "public"."products"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_product_cost_history"();
DROP TRIGGER IF EXISTS "trg_product_cost_history" ON "public"."product_variants";
CREATE TRIGGER "trg_product_cost_history" AFTER INSERT OR UPDATE ON "public"."product_variants"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_product_cost_history"();

-- Baseline: the state of everything at the moment this is applied (only once) ---
INSERT INTO "public"."order_status_history" (store_id, order_id, status, payment_status, source)
SELECT o.store_id, o.id, o.status, o.payment_status, 'baseline'
FROM "public"."orders" o
WHERE o.store_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "public"."order_status_history" h WHERE h.order_id = o.id AND h.source = 'baseline');

INSERT INTO "public"."product_cost_history" (store_id, product_id, variant_id, tp_price, base_price, discounted_price, source)
SELECT p.store_id, p.id, NULL, p.tp_price, p.base_price, p.discounted_price, 'baseline'
FROM "public"."products" p
WHERE p.store_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "public"."product_cost_history" h WHERE h.product_id = p.id AND h.variant_id IS NULL AND h.source = 'baseline');

INSERT INTO "public"."product_cost_history" (store_id, product_id, variant_id, tp_price, base_price, discounted_price, source)
SELECT p.store_id, v.product_id, v.id, v.tp_price, v.base_price, v.discounted_price, 'baseline'
FROM "public"."product_variants" v
JOIN "public"."products" p ON p.id = v.product_id
WHERE p.store_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "public"."product_cost_history" h WHERE h.variant_id = v.id AND h.source = 'baseline');

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

  -- Inventory: stock now, less movements after the day; cost and price as they were on the day.
  WITH moved AS (
    SELECT sm.product_id, sm.variant_id, SUM(sm.delta) AS after_delta
    FROM public.stock_movements sm
    JOIN public.products mp ON mp.id = sm.product_id AND mp.store_id = p_store_id
    WHERE sm.created_at >= v_end
      AND (p_branch_id IS NULL OR sm.branch_id = p_branch_id)
    GROUP BY sm.product_id, sm.variant_id
  ),
  lines AS (
    SELECT GREATEST(
             (CASE WHEN p_branch_id IS NULL THEN pi.quantity_available ELSE COALESCE(bi.quantity_available, 0) END)
             - COALESCE(mv.after_delta, 0), 0) AS qa,
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
