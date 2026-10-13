-- Rebuild every dashboard rollup (store-wide and per branch) from the orders.
--
-- "All branches" reads dashboard_daily_metrics and a branch reads
-- dashboard_branch_daily_metrics. They are kept current by separate triggers,
-- so a day written by one path and missed by the other leaves All branches
-- different from the sum of its branches. Recomputing both from the orders
-- makes them agree again. Idempotent; uses the current function bodies.
-- Requires 20261015000000_dashboard_profit_item_total_ratio.sql.

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT store_id, order_date FROM public.orders WHERE order_date IS NOT NULL LOOP
    PERFORM public.recompute_dashboard_daily_metrics(r.store_id, r.order_date);
    PERFORM public.recompute_dashboard_branch_daily(r.store_id, r.order_date);
  END LOOP;
END $$;
