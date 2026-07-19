-- One-time backfill: populates the new dashboard rollup tables from
-- existing orders/order_items/expenses/product_inventory so historical
-- days aren't blank until their next write. Reuses the same recompute
-- functions the triggers call (20260719000004/20260719000005), just driven
-- by a loop over every distinct bucket that already has data.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT store_id, (created_at AT TIME ZONE 'Asia/Dhaka')::date AS d
    FROM public.orders
  LOOP
    PERFORM public.recompute_dashboard_daily_metrics(r.store_id, r.d);
  END LOOP;

  FOR r IN
    SELECT DISTINCT store_id, customer_id FROM public.orders WHERE customer_id IS NOT NULL
  LOOP
    PERFORM public.recompute_dashboard_customer_summary(r.store_id, r.customer_id);
  END LOOP;

  FOR r IN
    SELECT DISTINCT store_id, expense_date AS d, category_id FROM public.expenses
  LOOP
    PERFORM public.recompute_dashboard_expense_category_summary(r.store_id, r.d, r.category_id);
  END LOOP;

  FOR r IN
    SELECT DISTINCT store_id FROM public.products
  LOOP
    PERFORM public.recompute_dashboard_inventory_summary(r.store_id);
  END LOOP;
END $$;
