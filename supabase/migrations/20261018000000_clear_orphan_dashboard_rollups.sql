-- Clear stale days from the dashboard rollups.
--
-- 20261017000000 rebuilt every day that still has orders. A rollup row for a
-- day with no orders (left behind when an order's date was changed or the
-- orders were removed) was never visited, so it kept adding to "All branches"
-- while every branch, which only counts real orders, stayed correct. Visiting
-- every day present in either place recomputes it, and recompute deletes the
-- row when no orders remain on that day. Idempotent.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT store_id, order_date AS d FROM public.orders WHERE order_date IS NOT NULL
    UNION
    SELECT store_id, summary_date FROM public.dashboard_daily_metrics
    UNION
    SELECT store_id, summary_date FROM public.dashboard_branch_daily_metrics
  LOOP
    PERFORM public.recompute_dashboard_daily_metrics(r.store_id, r.d);
    PERFORM public.recompute_dashboard_branch_daily(r.store_id, r.d);
  END LOOP;
END $$;
