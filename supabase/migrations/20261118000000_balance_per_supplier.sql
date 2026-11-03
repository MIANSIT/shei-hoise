-- Balance snapshot: several suppliers are counted one by one.
--
-- get_balance_snapshot (20261113) worked out Accounts payable as all supplier
-- bills minus all supplier payments, so money paid ahead to one supplier hid
-- what the shop still owed another. It now adds up each supplier's own balance:
--   accounts_payable  Σ of each supplier's (bills − payments) where that is above 0
--   supplier_advance  Σ of what suppliers were paid above their bills (an asset)
-- This matches the Supplier Bills page, where every supplier's payments are
-- applied to that supplier's own oldest bills.
-- Same arguments, additive: old code ignores supplier_advance.
--
-- Requires 20261113000000_accrual_statements.sql.

CREATE OR REPLACE FUNCTION "public"."get_balance_snapshot"(
    "p_store_id" "uuid",
    "p_branch_id" "uuid" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_inv_cost numeric := 0;
  v_inv_sell numeric := 0;
  v_units numeric := 0;
  v_no_cost integer := 0;
  v_payable numeric := NULL;
  v_advance numeric := NULL;
  v_pending jsonb;
BEGIN
  IF NOT public.has_store_permission(p_store_id, 'dashboard.view') THEN
    RAISE EXCEPTION 'Not authorized for store %', p_store_id;
  END IF;
  IF NOT public.can_view_store_branch(p_store_id, p_branch_id) THEN
    RAISE EXCEPTION 'Not authorized for this branch';
  END IF;

  -- Same shelf rules as the dashboard's inventory figures.
  WITH lines AS (
    SELECT CASE WHEN p_branch_id IS NULL THEN pi.quantity_available
                ELSE COALESCE(bi.quantity_available, 0) END AS qa,
           CASE WHEN pi.variant_id IS NOT NULL
                THEN COALESCE(NULLIF(v.discounted_price, 0), v.base_price)
                ELSE COALESCE(NULLIF(p.discounted_price, 0), p.base_price) END AS price,
           CASE WHEN pi.variant_id IS NOT NULL
                THEN COALESCE(v.tp_price, p.tp_price)
                ELSE p.tp_price END AS cost
    FROM public.products p
    JOIN public.product_inventory pi ON pi.product_id = p.id
    LEFT JOIN public.product_variants v ON v.id = pi.variant_id
    LEFT JOIN public.branch_inventory bi
      ON p_branch_id IS NOT NULL
     AND bi.branch_id = p_branch_id AND bi.product_id = p.id
     AND bi.variant_id IS NOT DISTINCT FROM pi.variant_id
    WHERE p.store_id = p_store_id
      AND pi.track_inventory IS NOT FALSE
      AND (
        (pi.variant_id IS NOT NULL AND v.is_active IS NOT FALSE)
        OR (pi.variant_id IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.product_variants v2 WHERE v2.product_id = p.id AND v2.is_active IS NOT FALSE))
      )
  )
  SELECT COALESCE(SUM(GREATEST(qa, 0) * COALESCE(cost, 0)), 0),
         COALESCE(SUM(GREATEST(qa, 0) * COALESCE(price, 0)), 0),
         COALESCE(SUM(GREATEST(qa, 0)), 0),
         COUNT(*) FILTER (WHERE qa > 0 AND COALESCE(cost, 0) = 0)
    INTO v_inv_cost, v_inv_sell, v_units, v_no_cost
  FROM lines;

  IF public.has_store_permission(p_store_id, 'stock.supplier_money') THEN
    BEGIN
      -- Each supplier on its own: what the shop owes one supplier is not reduced by money
      -- paid ahead to another. A supplier paid more than billed is an advance (an asset).
      SELECT COALESCE(SUM(GREATEST(s.bal, 0)), 0), COALESCE(SUM(GREATEST(-s.bal, 0)), 0)
        INTO v_payable, v_advance
      FROM (
        SELECT SUM(CASE WHEN kind = 'bill' THEN amount ELSE -amount END) AS bal
        FROM public.supplier_ledger
        WHERE store_id = p_store_id
        GROUP BY supplier_id
      ) s;
    EXCEPTION WHEN undefined_table THEN
      v_payable := NULL;
      v_advance := NULL;
    END;
  END IF;

  v_pending := public.get_pending_balance(p_store_id, p_branch_id);

  RETURN jsonb_build_object(
    'inventory_cost', v_inv_cost,
    'inventory_sell', v_inv_sell,
    'inventory_units', v_units,
    'items_without_cost', v_no_cost,
    'customer_due', COALESCE((v_pending ->> 'customer_due')::numeric, 0),
    'cod_pending', COALESCE((v_pending ->> 'cod_pending')::numeric, 0),
    'accounts_payable', v_payable,
    'supplier_advance', v_advance
  );
END;
$$;
ALTER FUNCTION "public"."get_balance_snapshot"("uuid", "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."get_balance_snapshot"("uuid", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_balance_snapshot"("uuid", "uuid") TO "authenticated";
