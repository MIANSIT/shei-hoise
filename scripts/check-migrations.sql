-- Which migrations are missing from this database?
--
-- Generated from supabase/migrations/*.sql: for each migration it checks that the tables, columns
-- and functions the file creates exist. Run it in Supabase Studio -> SQL Editor. It only reads.
--
-- Reading the result: one row per migration that has something missing, oldest first. Apply those
-- files in that order. Limits: a migration that only changes the body of a function that already
-- exists cannot be detected, and an object a later migration dropped or renamed shows as missing
-- even though that is fine. Judge by the oldest rows first.
--
-- Generated 2026-11-02 from the migration files then in the project; migrations added later are not covered.

WITH checks AS (
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'table' AS kind, 'customer_risk_profiles' AS object, to_regclass('public.customer_risk_profiles') IS NOT NULL AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'table' AS kind, 'customer_risk_store_touches' AS object, to_regclass('public.customer_risk_store_touches') IS NOT NULL AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'column' AS kind, 'store_settings.facebook_capi_access_token' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'facebook_capi_access_token') AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'column' AS kind, 'store_settings.facebook_test_event_code' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'facebook_test_event_code') AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'column' AS kind, 'pixel_events.capi_delivered' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pixel_events' AND column_name = 'capi_delivered') AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'column' AS kind, 'pixel_events.capi_error' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pixel_events' AND column_name = 'capi_error') AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'column' AS kind, 'subscription_plans.is_default_trial_plan' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'is_default_trial_plan') AS present
  UNION ALL
  SELECT '20260703120000_facebook_commerce_and_trial_system' AS migration, 'column' AS kind, 'orders.fb_purchase_event_status' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'fb_purchase_event_status') AS present
  UNION ALL
  SELECT '20260706120000_add_pathao_credentials' AS migration, 'table' AS kind, 'store_pathao_credentials' AS object, to_regclass('public.store_pathao_credentials') IS NOT NULL AS present
  UNION ALL
  SELECT '20260706130000_add_pathao_order_fields' AS migration, 'column' AS kind, 'orders.pathao_consignment_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pathao_consignment_id') AS present
  UNION ALL
  SELECT '20260706130000_add_pathao_order_fields' AS migration, 'column' AS kind, 'orders.pathao_order_status' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pathao_order_status') AS present
  UNION ALL
  SELECT '20260706140000_add_pathao_environment' AS migration, 'column' AS kind, 'store_pathao_credentials.environment' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_pathao_credentials' AND column_name = 'environment') AS present
  UNION ALL
  SELECT '20260706150000_pathao_multiple_accounts' AS migration, 'column' AS kind, 'store_pathao_credentials.label' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_pathao_credentials' AND column_name = 'label') AS present
  UNION ALL
  SELECT '20260706150000_pathao_multiple_accounts' AS migration, 'column' AS kind, 'orders.pathao_credential_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pathao_credential_id') AS present
  UNION ALL
  SELECT '20260707100000_add_pathao_shipment_details' AS migration, 'column' AS kind, 'orders.pathao_shipment_details' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pathao_shipment_details') AS present
  UNION ALL
  SELECT '20260707120000_add_steadfast_courier' AS migration, 'column' AS kind, 'store_courier_credentials.courier' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_courier_credentials' AND column_name = 'courier') AS present
  UNION ALL
  SELECT '20260707120000_add_steadfast_courier' AS migration, 'column' AS kind, 'store_courier_credentials.api_key' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_courier_credentials' AND column_name = 'api_key') AS present
  UNION ALL
  SELECT '20260707120000_add_steadfast_courier' AS migration, 'column' AS kind, 'store_courier_credentials.secret_key' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_courier_credentials' AND column_name = 'secret_key') AS present
  UNION ALL
  SELECT '20260707120000_add_steadfast_courier' AS migration, 'column' AS kind, 'orders.courier' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'courier') AS present
  UNION ALL
  SELECT '20260707130000_add_delivery_couriers' AS migration, 'column' AS kind, 'store_settings.delivery_couriers' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'delivery_couriers') AS present
  UNION ALL
  SELECT '20260707150000_add_courier_shipment_history' AS migration, 'column' AS kind, 'orders.courier_shipment_history' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'courier_shipment_history') AS present
  UNION ALL
  SELECT '20260707160000_add_courier_tracking_table' AS migration, 'table' AS kind, 'courier_tracking' AS object, to_regclass('public.courier_tracking') IS NOT NULL AS present
  UNION ALL
  SELECT '20260708100000_add_pathao_webhook_secret' AS migration, 'table' AS kind, 'pathao_webhook_debug_log' AS object, to_regclass('public.pathao_webhook_debug_log') IS NOT NULL AS present
  UNION ALL
  SELECT '20260708100000_add_pathao_webhook_secret' AS migration, 'column' AS kind, 'store_courier_credentials.webhook_secret' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_courier_credentials' AND column_name = 'webhook_secret') AS present
  UNION ALL
  SELECT '20260709000000_add_stock_movements_and_atomic_inventory' AS migration, 'table' AS kind, 'stock_movements' AS object, to_regclass('public.stock_movements') IS NOT NULL AS present
  UNION ALL
  SELECT '20260709000000_add_stock_movements_and_atomic_inventory' AS migration, 'function' AS kind, 'adjust_inventory()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'adjust_inventory') AS present
  UNION ALL
  SELECT '20260709000000_add_stock_movements_and_atomic_inventory' AS migration, 'function' AS kind, 'set_inventory()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'set_inventory') AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendors' AS object, to_regclass('public.vendors') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_stock' AS object, to_regclass('public.vendor_stock') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_orders' AS object, to_regclass('public.vendor_orders') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_order_items' AS object, to_regclass('public.vendor_order_items') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_settlements' AS object, to_regclass('public.vendor_settlements') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_settlement_items' AS object, to_regclass('public.vendor_settlement_items') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_payments' AS object, to_regclass('public.vendor_payments') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'table' AS kind, 'vendor_stock_movements' AS object, to_regclass('public.vendor_stock_movements') IS NOT NULL AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'function' AS kind, 'confirm_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'confirm_vendor_order') AS present
  UNION ALL
  SELECT '20260711000000_add_vendor_distribution_module' AS migration, 'function' AS kind, 'record_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_settlement') AS present
  UNION ALL
  SELECT '20260713000000_add_vendor_payment_method' AS migration, 'function' AS kind, 'record_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_settlement') AS present
  UNION ALL
  SELECT '20260713000000_add_vendor_payment_method' AS migration, 'column' AS kind, 'vendor_payments.payment_method' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_payments' AND column_name = 'payment_method') AS present
  UNION ALL
  SELECT '20260714000000_add_vendor_order_delivery_cost' AS migration, 'column' AS kind, 'vendor_orders.delivery_cost' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_orders' AND column_name = 'delivery_cost') AS present
  UNION ALL
  SELECT '20260716000000_add_vendor_credit_limit' AS migration, 'column' AS kind, 'vendors.credit_limit' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'credit_limit') AS present
  UNION ALL
  SELECT '20260719000000_add_order_items_cost_price' AS migration, 'column' AS kind, 'order_items.cost_price' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'cost_price') AS present
  UNION ALL
  SELECT '20260719000003_add_dashboard_summary_tables' AS migration, 'table' AS kind, 'dashboard_daily_metrics' AS object, to_regclass('public.dashboard_daily_metrics') IS NOT NULL AS present
  UNION ALL
  SELECT '20260719000003_add_dashboard_summary_tables' AS migration, 'table' AS kind, 'dashboard_daily_product_summary' AS object, to_regclass('public.dashboard_daily_product_summary') IS NOT NULL AS present
  UNION ALL
  SELECT '20260719000003_add_dashboard_summary_tables' AS migration, 'table' AS kind, 'dashboard_customer_summary' AS object, to_regclass('public.dashboard_customer_summary') IS NOT NULL AS present
  UNION ALL
  SELECT '20260719000003_add_dashboard_summary_tables' AS migration, 'table' AS kind, 'dashboard_daily_expense_category_summary' AS object, to_regclass('public.dashboard_daily_expense_category_summary') IS NOT NULL AS present
  UNION ALL
  SELECT '20260719000003_add_dashboard_summary_tables' AS migration, 'table' AS kind, 'dashboard_inventory_summary' AS object, to_regclass('public.dashboard_inventory_summary') IS NOT NULL AS present
  UNION ALL
  SELECT '20260719000004_add_dashboard_order_expense_triggers' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20260719000004_add_dashboard_order_expense_triggers' AS migration, 'function' AS kind, 'recompute_dashboard_customer_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_customer_summary') AS present
  UNION ALL
  SELECT '20260719000004_add_dashboard_order_expense_triggers' AS migration, 'function' AS kind, 'trg_orders_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_orders_dashboard') AS present
  UNION ALL
  SELECT '20260719000004_add_dashboard_order_expense_triggers' AS migration, 'function' AS kind, 'trg_order_items_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_order_items_dashboard') AS present
  UNION ALL
  SELECT '20260719000004_add_dashboard_order_expense_triggers' AS migration, 'function' AS kind, 'recompute_dashboard_expense_category_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_expense_category_summary') AS present
  UNION ALL
  SELECT '20260719000004_add_dashboard_order_expense_triggers' AS migration, 'function' AS kind, 'trg_expenses_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_expenses_dashboard') AS present
  UNION ALL
  SELECT '20260719000005_add_dashboard_inventory_trigger' AS migration, 'function' AS kind, 'recompute_dashboard_inventory_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_inventory_summary') AS present
  UNION ALL
  SELECT '20260719000005_add_dashboard_inventory_trigger' AS migration, 'function' AS kind, 'trg_product_inventory_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_product_inventory_dashboard') AS present
  UNION ALL
  SELECT '20260719000005_add_dashboard_inventory_trigger' AS migration, 'function' AS kind, 'trg_products_price_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_products_price_dashboard') AS present
  UNION ALL
  SELECT '20260719000005_add_dashboard_inventory_trigger' AS migration, 'function' AS kind, 'trg_product_variants_price_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_product_variants_price_dashboard') AS present
  UNION ALL
  SELECT '20260719000006_add_get_dashboard_summary_rpc' AS migration, 'function' AS kind, 'get_dashboard_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_dashboard_summary') AS present
  UNION ALL
  SELECT '20260719000008_track_vendor_order_upfront_payment' AS migration, 'function' AS kind, 'confirm_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'confirm_vendor_order') AS present
  UNION ALL
  SELECT '20260720000000_add_cancel_vendor_order' AS migration, 'function' AS kind, 'cancel_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_vendor_order') AS present
  UNION ALL
  SELECT '20260720000001_add_items_to_confirmed_vendor_order' AS migration, 'function' AS kind, 'add_items_to_confirmed_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'add_items_to_confirmed_vendor_order') AS present
  UNION ALL
  SELECT '20260723000000_add_product_bundles' AS migration, 'table' AS kind, 'bundle_items' AS object, to_regclass('public.bundle_items') IS NOT NULL AS present
  UNION ALL
  SELECT '20260723000000_add_product_bundles' AS migration, 'column' AS kind, 'products.product_type' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'product_type') AS present
  UNION ALL
  SELECT '20260723000000_add_product_bundles' AS migration, 'column' AS kind, 'order_items.parent_order_item_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'parent_order_item_id') AS present
  UNION ALL
  SELECT '20260723000001_add_bundle_option_groups' AS migration, 'column' AS kind, 'bundle_items.option_group_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bundle_items' AND column_name = 'option_group_id') AS present
  UNION ALL
  SELECT '20260723000001_add_bundle_option_groups' AS migration, 'column' AS kind, 'bundle_items.option_group_label' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bundle_items' AND column_name = 'option_group_label') AS present
  UNION ALL
  SELECT '20260802000000_add_password_reset_tokens' AS migration, 'table' AS kind, 'password_reset_tokens' AS object, to_regclass('public.password_reset_tokens') IS NOT NULL AS present
  UNION ALL
  SELECT '20260802000000_add_password_reset_tokens' AS migration, 'function' AS kind, 'get_auth_user_id_by_email()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_auth_user_id_by_email') AS present
  UNION ALL
  SELECT '20260819000000_add_product_free_delivery' AS migration, 'column' AS kind, 'products.free_delivery' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'free_delivery') AS present
  UNION ALL
  SELECT '20260820000000_add_store_setup_completed_flag' AS migration, 'column' AS kind, 'stores.setup_completed_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'setup_completed_at') AS present
  UNION ALL
  SELECT '20260821000000_add_store_setup_progress' AS migration, 'column' AS kind, 'stores.setup_progress' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'setup_progress') AS present
  UNION ALL
  SELECT '20260822000000_add_vendor_rpc_ownership_checks' AS migration, 'function' AS kind, 'record_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_settlement') AS present
  UNION ALL
  SELECT '20260822000000_add_vendor_rpc_ownership_checks' AS migration, 'function' AS kind, 'confirm_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'confirm_vendor_order') AS present
  UNION ALL
  SELECT '20260822000000_add_vendor_rpc_ownership_checks' AS migration, 'function' AS kind, 'cancel_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_vendor_order') AS present
  UNION ALL
  SELECT '20260822000000_add_vendor_rpc_ownership_checks' AS migration, 'function' AS kind, 'add_items_to_confirmed_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'add_items_to_confirmed_vendor_order') AS present
  UNION ALL
  SELECT '20260822000000_add_vendor_rpc_ownership_checks' AS migration, 'function' AS kind, 'adjust_inventory()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'adjust_inventory') AS present
  UNION ALL
  SELECT '20260822000000_add_vendor_rpc_ownership_checks' AS migration, 'function' AS kind, 'set_inventory()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'set_inventory') AS present
  UNION ALL
  SELECT '20260823000000_fix_vendor_settlement_null_price' AS migration, 'function' AS kind, 'record_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_settlement') AS present
  UNION ALL
  SELECT '20260823000001_add_vendor_order_id_to_payments' AS migration, 'function' AS kind, 'confirm_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'confirm_vendor_order') AS present
  UNION ALL
  SELECT '20260823000001_add_vendor_order_id_to_payments' AS migration, 'function' AS kind, 'cancel_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_vendor_order') AS present
  UNION ALL
  SELECT '20260823000001_add_vendor_order_id_to_payments' AS migration, 'column' AS kind, 'vendor_payments.vendor_order_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_payments' AND column_name = 'vendor_order_id') AS present
  UNION ALL
  SELECT '20260823000002_add_update_vendor_order_draft_rpc' AS migration, 'function' AS kind, 'update_vendor_order_draft()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_vendor_order_draft') AS present
  UNION ALL
  SELECT '20260823000004_scope_cancel_upfront_payment_cleanup' AS migration, 'function' AS kind, 'cancel_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_vendor_order') AS present
  UNION ALL
  SELECT '20260823000005_fix_vendor_rpc_ownership_regression' AS migration, 'function' AS kind, 'record_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_settlement') AS present
  UNION ALL
  SELECT '20260823000005_fix_vendor_rpc_ownership_regression' AS migration, 'function' AS kind, 'confirm_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'confirm_vendor_order') AS present
  UNION ALL
  SELECT '20260823000005_fix_vendor_rpc_ownership_regression' AS migration, 'function' AS kind, 'cancel_vendor_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_vendor_order') AS present
  UNION ALL
  SELECT '20260823000006_add_delete_vendor_settlement_rpc' AS migration, 'function' AS kind, 'delete_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'delete_vendor_settlement') AS present
  UNION ALL
  SELECT '20260825000000_add_coupons' AS migration, 'table' AS kind, 'coupons' AS object, to_regclass('public.coupons') IS NOT NULL AS present
  UNION ALL
  SELECT '20260825000000_add_coupons' AS migration, 'table' AS kind, 'coupon_redemptions' AS object, to_regclass('public.coupon_redemptions') IS NOT NULL AS present
  UNION ALL
  SELECT '20260825000000_add_coupons' AS migration, 'function' AS kind, 'redeem_coupon()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'redeem_coupon') AS present
  UNION ALL
  SELECT '20260825000001_add_flash_sale_scheduling' AS migration, 'column' AS kind, 'products.sale_starts_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sale_starts_at') AS present
  UNION ALL
  SELECT '20260825000001_add_flash_sale_scheduling' AS migration, 'column' AS kind, 'products.sale_ends_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sale_ends_at') AS present
  UNION ALL
  SELECT '20260825000001_add_flash_sale_scheduling' AS migration, 'column' AS kind, 'product_variants.sale_starts_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'sale_starts_at') AS present
  UNION ALL
  SELECT '20260825000001_add_flash_sale_scheduling' AS migration, 'column' AS kind, 'product_variants.sale_ends_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'sale_ends_at') AS present
  UNION ALL
  SELECT '20260825000002_add_order_coupon_reference' AS migration, 'column' AS kind, 'orders.coupon_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'coupon_id') AS present
  UNION ALL
  SELECT '20260825000002_add_order_coupon_reference' AS migration, 'column' AS kind, 'orders.coupon_code' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'coupon_code') AS present
  UNION ALL
  SELECT '20260825000003_add_coupon_per_customer_limit' AS migration, 'function' AS kind, 'redeem_coupon()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'redeem_coupon') AS present
  UNION ALL
  SELECT '20260825000003_add_coupon_per_customer_limit' AS migration, 'column' AS kind, 'coupons.max_uses_per_customer' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'max_uses_per_customer') AS present
  UNION ALL
  SELECT '20260825000003_add_coupon_per_customer_limit' AS migration, 'column' AS kind, 'coupon_redemptions.customer_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupon_redemptions' AND column_name = 'customer_id') AS present
  UNION ALL
  SELECT '20260828000001_add_customer_email_lookup_rpcs' AS migration, 'function' AS kind, 'check_customer_email_exists()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'check_customer_email_exists') AS present
  UNION ALL
  SELECT '20260828000001_add_customer_email_lookup_rpcs' AS migration, 'function' AS kind, 'find_customer_by_email()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'find_customer_by_email') AS present
  UNION ALL
  SELECT '20260829000000_add_onboarding_email_verifications' AS migration, 'table' AS kind, 'onboarding_email_verifications' AS object, to_regclass('public.onboarding_email_verifications') IS NOT NULL AS present
  UNION ALL
  SELECT '20260829000000_add_review_invite_tokens' AS migration, 'table' AS kind, 'review_invite_tokens' AS object, to_regclass('public.review_invite_tokens') IS NOT NULL AS present
  UNION ALL
  SELECT '20260829010000_add_whatsapp_notified_at_to_orders' AS migration, 'column' AS kind, 'orders.whatsapp_notified_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'whatsapp_notified_at') AS present
  UNION ALL
  SELECT '20260830000000_add_store_review_categories' AS migration, 'column' AS kind, 'store_reviews.product_quality_rating' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'product_quality_rating') AS present
  UNION ALL
  SELECT '20260830000000_add_store_review_categories' AS migration, 'column' AS kind, 'store_reviews.delivery_rating' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'delivery_rating') AS present
  UNION ALL
  SELECT '20260830000000_add_store_review_categories' AS migration, 'column' AS kind, 'store_reviews.service_rating' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'service_rating') AS present
  UNION ALL
  SELECT '20260830000000_add_store_review_categories' AS migration, 'column' AS kind, 'store_reviews.value_rating' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'value_rating') AS present
  UNION ALL
  SELECT '20260901000000_add_order_channel' AS migration, 'column' AS kind, 'orders.channel' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'channel') AS present
  UNION ALL
  SELECT '20260902000000_add_customer_payments' AS migration, 'table' AS kind, 'customer_payments' AS object, to_regclass('public.customer_payments') IS NOT NULL AS present
  UNION ALL
  SELECT '20260909000000_add_order_cash_received' AS migration, 'column' AS kind, 'orders.cash_received' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cash_received') AS present
  UNION ALL
  SELECT '20260910000000_add_order_delivery_costs' AS migration, 'table' AS kind, 'order_delivery_costs' AS object, to_regclass('public.order_delivery_costs') IS NOT NULL AS present
  UNION ALL
  SELECT '20260910000000_add_order_delivery_costs' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20260910000000_add_order_delivery_costs' AS migration, 'function' AS kind, 'trg_order_delivery_costs_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_order_delivery_costs_dashboard') AS present
  UNION ALL
  SELECT '20260910000001_add_order_date_to_orders' AS migration, 'column' AS kind, 'orders.order_date' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_date') AS present
  UNION ALL
  SELECT '20260910000002_add_order_returned_status' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20260910000002_add_order_returned_status' AS migration, 'function' AS kind, 'get_dashboard_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_dashboard_summary') AS present
  UNION ALL
  SELECT '20260910000002_add_order_returned_status' AS migration, 'column' AS kind, 'dashboard_daily_metrics.status_returned' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dashboard_daily_metrics' AND column_name = 'status_returned') AS present
  UNION ALL
  SELECT '20260910000002_add_order_returned_status' AS migration, 'column' AS kind, 'customer_risk_profiles.returned_orders' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_risk_profiles' AND column_name = 'returned_orders') AS present
  UNION ALL
  SELECT '20260910000003_add_order_link_tokens' AS migration, 'table' AS kind, 'order_link_tokens' AS object, to_regclass('public.order_link_tokens') IS NOT NULL AS present
  UNION ALL
  SELECT '20260912000000_add_storefront_branding' AS migration, 'table' AS kind, 'store_branding' AS object, to_regclass('public.store_branding') IS NOT NULL AS present
  UNION ALL
  SELECT '20260912000000_add_storefront_branding' AS migration, 'table' AS kind, 'store_hero_slides' AS object, to_regclass('public.store_hero_slides') IS NOT NULL AS present
  UNION ALL
  SELECT '20260912000000_add_storefront_branding' AS migration, 'column' AS kind, 'coupons.title' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'title') AS present
  UNION ALL
  SELECT '20260912000000_add_storefront_branding' AS migration, 'column' AS kind, 'coupons.is_featured' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'is_featured') AS present
  UNION ALL
  SELECT '20260912000000_add_storefront_branding' AS migration, 'column' AS kind, 'coupons.show_on_storefront' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'show_on_storefront') AS present
  UNION ALL
  SELECT '20260914000000_add_promo_banners' AS migration, 'table' AS kind, 'store_promo_banners' AS object, to_regclass('public.store_promo_banners') IS NOT NULL AS present
  UNION ALL
  SELECT '20260914000001_add_product_sort_order' AS migration, 'function' AS kind, 'reorder_products()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'reorder_products') AS present
  UNION ALL
  SELECT '20260914000001_add_product_sort_order' AS migration, 'column' AS kind, 'products.sort_order' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sort_order') AS present
  UNION ALL
  SELECT '20260915000000_add_store_announcements' AS migration, 'table' AS kind, 'store_announcements' AS object, to_regclass('public.store_announcements') IS NOT NULL AS present
  UNION ALL
  SELECT '20260917000000_add_store_seo_fields' AS migration, 'column' AS kind, 'stores.seo_title' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'seo_title') AS present
  UNION ALL
  SELECT '20260917000000_add_store_seo_fields' AS migration, 'column' AS kind, 'stores.seo_description' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'seo_description') AS present
  UNION ALL
  SELECT '20260917000001_add_cod_settlements' AS migration, 'table' AS kind, 'store_cod_settlements' AS object, to_regclass('public.store_cod_settlements') IS NOT NULL AS present
  UNION ALL
  SELECT '20260917000001_add_cod_settlements' AS migration, 'column' AS kind, 'orders.cod_settlement_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cod_settlement_id') AS present
  UNION ALL
  SELECT '20260917000002_add_register_opening_cash' AS migration, 'table' AS kind, 'store_register_openings' AS object, to_regclass('public.store_register_openings') IS NOT NULL AS present
  UNION ALL
  SELECT '20260918000000_dashboard_metrics_use_order_date' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20260918000000_dashboard_metrics_use_order_date' AS migration, 'function' AS kind, 'recompute_dashboard_customer_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_customer_summary') AS present
  UNION ALL
  SELECT '20260918000000_dashboard_metrics_use_order_date' AS migration, 'function' AS kind, 'trg_orders_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_orders_dashboard') AS present
  UNION ALL
  SELECT '20260918000000_dashboard_metrics_use_order_date' AS migration, 'function' AS kind, 'trg_order_items_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_order_items_dashboard') AS present
  UNION ALL
  SELECT '20260918000001_add_profit_loss_report_rpc' AS migration, 'function' AS kind, 'get_profit_loss_report()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_profit_loss_report') AS present
  UNION ALL
  SELECT '20260919000000_dashboard_metrics_exclude_cancelled' AS migration, 'table' AS kind, 'order_delivery_costs' AS object, to_regclass('public.order_delivery_costs') IS NOT NULL AS present
  UNION ALL
  SELECT '20260919000000_dashboard_metrics_exclude_cancelled' AS migration, 'function' AS kind, 'trg_order_delivery_costs_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_order_delivery_costs_dashboard') AS present
  UNION ALL
  SELECT '20260919000000_dashboard_metrics_exclude_cancelled' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20260919000000_dashboard_metrics_exclude_cancelled' AS migration, 'function' AS kind, 'recompute_dashboard_customer_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_customer_summary') AS present
  UNION ALL
  SELECT '20260919000000_dashboard_metrics_exclude_cancelled' AS migration, 'function' AS kind, 'get_profit_loss_report()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_profit_loss_report') AS present
  UNION ALL
  SELECT '20260919000000_dashboard_metrics_exclude_cancelled' AS migration, 'column' AS kind, 'dashboard_daily_metrics.status_returned' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dashboard_daily_metrics' AND column_name = 'status_returned') AS present
  UNION ALL
  SELECT '20260926000000_profit_loss_additional_charges' AS migration, 'function' AS kind, 'get_profit_loss_report()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_profit_loss_report') AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'table' AS kind, 'store_roles' AS object, to_regclass('public.store_roles') IS NOT NULL AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'table' AS kind, 'store_staff' AS object, to_regclass('public.store_staff') IS NOT NULL AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'table' AS kind, 'store_activity_log' AS object, to_regclass('public.store_activity_log') IS NOT NULL AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'function' AS kind, 'trg_store_activity_log_no_update()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_store_activity_log_no_update') AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'function' AS kind, 'store_has_feature()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'store_has_feature') AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'function' AS kind, 'has_store_permission()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'has_store_permission') AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'function' AS kind, 'revoke_user_sessions()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'revoke_user_sessions') AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'function' AS kind, 'get_dashboard_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_dashboard_summary') AS present
  UNION ALL
  SELECT '20261001000000_add_staff_accounts' AS migration, 'function' AS kind, 'get_profit_loss_report()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_profit_loss_report') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'table' AS kind, 'store_branches' AS object, to_regclass('public.store_branches') IS NOT NULL AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'table' AS kind, 'branch_inventory' AS object, to_regclass('public.branch_inventory') IS NOT NULL AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'table' AS kind, 'branch_stock_transfers' AS object, to_regclass('public.branch_stock_transfers') IS NOT NULL AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'table' AS kind, 'branch_stock_transfer_items' AS object, to_regclass('public.branch_stock_transfer_items') IS NOT NULL AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'trg_branch_stock_transfer_number()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_branch_stock_transfer_number') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'branch_sync_active()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'branch_sync_active') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'branch_sync_set()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'branch_sync_set') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'recompute_product_inventory_total()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_product_inventory_total') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'trg_branch_inventory_sync()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_branch_inventory_sync') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'default_store_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'default_store_branch') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'branch_inventory_add()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'branch_inventory_add') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'spread_inventory_delta()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'spread_inventory_delta') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'trg_product_inventory_to_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_product_inventory_to_branches') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'recompute_store_inventory_totals()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_store_inventory_totals') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'trg_store_branches_active_changed()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_store_branches_active_changed') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'enable_store_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'enable_store_branches') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'reorder_store_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'reorder_store_branches') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'adjust_branch_inventory()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'adjust_branch_inventory') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'set_branch_inventory()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'set_branch_inventory') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'send_branch_transfer()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'send_branch_transfer') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'receive_branch_transfer()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'receive_branch_transfer') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'function' AS kind, 'cancel_branch_transfer()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_branch_transfer') AS present
  UNION ALL
  SELECT '20261002000000_add_store_branches' AS migration, 'column' AS kind, 'stock_movements.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'function' AS kind, 'enable_store_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'enable_store_branches') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'function' AS kind, 'stock_move()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'stock_move') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'function' AS kind, 'order_stock_move()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'order_stock_move') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'function' AS kind, 'suggest_order_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'suggest_order_branches') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'function' AS kind, 'move_order_to_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'move_order_to_branch') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'column' AS kind, 'orders.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'column' AS kind, 'orders.needs_transfer' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'needs_transfer') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'column' AS kind, 'orders.branch_confirmed' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'branch_confirmed') AS present
  UNION ALL
  SELECT '20261003000000_add_order_branches' AS migration, 'column' AS kind, 'stores.branch_assignment_mode' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'branch_assignment_mode') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'table' AS kind, 'dashboard_branch_daily_metrics' AS object, to_regclass('public.dashboard_branch_daily_metrics') IS NOT NULL AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'table' AS kind, 'dashboard_branch_daily_product_summary' AS object, to_regclass('public.dashboard_branch_daily_product_summary') IS NOT NULL AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'trg_fill_money_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_fill_money_branch') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'backfill_store_money_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'backfill_store_money_branches') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'enable_store_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'enable_store_branches') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'recompute_dashboard_branch_daily()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_branch_daily') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'trg_orders_branch_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_orders_branch_dashboard') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'trg_order_child_branch_dashboard()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_order_child_branch_dashboard') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'can_view_store_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'can_view_store_branch') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'branch_dashboard_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'branch_dashboard_summary') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'get_dashboard_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_dashboard_summary') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'get_profit_loss_report()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_profit_loss_report') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'function' AS kind, 'get_branch_comparison()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_branch_comparison') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'column' AS kind, 'expenses.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'column' AS kind, 'customer_payments.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_payments' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'column' AS kind, 'store_cod_settlements.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_cod_settlements' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'column' AS kind, 'store_register_openings.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_register_openings' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261004000000_add_branch_money' AS migration, 'column' AS kind, 'vendor_payments.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_payments' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'inventory_branch_target()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'inventory_branch_target') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'trg_product_inventory_to_branches()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_product_inventory_to_branches') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'trg_fill_money_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_fill_money_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'check_branch_stock()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'check_branch_stock') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'set_inventory_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'set_inventory_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'confirm_vendor_order_at_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'confirm_vendor_order_at_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'add_items_to_confirmed_vendor_order_at_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'add_items_to_confirmed_vendor_order_at_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'cancel_vendor_order_at_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_vendor_order_at_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'record_vendor_settlement_at_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_settlement_at_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'function' AS kind, 'delete_vendor_settlement_at_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'delete_vendor_settlement_at_branch') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'column' AS kind, 'vendor_orders.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_orders' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261005000000_add_vendor_branches' AS migration, 'column' AS kind, 'vendor_settlements.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendor_settlements' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261006000000_add_branch_customers' AS migration, 'function' AS kind, 'get_branch_customer_page()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_branch_customer_page') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'function' AS kind, 'recompute_dashboard_branch_daily()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_branch_daily') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'function' AS kind, 'get_sales_summary()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_sales_summary') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'function' AS kind, 'get_branch_comparison()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_branch_comparison') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'column' AS kind, 'dashboard_daily_metrics.sales_amount' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dashboard_daily_metrics' AND column_name = 'sales_amount') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'column' AS kind, 'dashboard_daily_metrics.sales_count' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dashboard_daily_metrics' AND column_name = 'sales_count') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'column' AS kind, 'dashboard_branch_daily_metrics.sales_amount' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dashboard_branch_daily_metrics' AND column_name = 'sales_amount') AS present
  UNION ALL
  SELECT '20261007000000_sales_received' AS migration, 'column' AS kind, 'dashboard_branch_daily_metrics.sales_count' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dashboard_branch_daily_metrics' AND column_name = 'sales_count') AS present
  UNION ALL
  SELECT '20261008000000_due_without_courier_cod' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20261008000000_due_without_courier_cod' AS migration, 'function' AS kind, 'recompute_dashboard_branch_daily()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_branch_daily') AS present
  UNION ALL
  SELECT '20261008000000_due_without_courier_cod' AS migration, 'function' AS kind, 'get_branch_comparison()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_branch_comparison') AS present
  UNION ALL
  SELECT '20261008000000_fix_money_branch_order_id' AS migration, 'function' AS kind, 'trg_fill_money_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'trg_fill_money_branch') AS present
  UNION ALL
  SELECT '20261009000000_invoice_printed' AS migration, 'column' AS kind, 'orders.invoice_printed_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'invoice_printed_at') AS present
  UNION ALL
  SELECT '20261010000000_cancel_transfer_item' AS migration, 'function' AS kind, 'cancel_branch_transfer_item()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_branch_transfer_item') AS present
  UNION ALL
  SELECT '20261011000000_receive_transfer_items' AS migration, 'function' AS kind, 'receive_branch_transfer_items()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'receive_branch_transfer_items') AS present
  UNION ALL
  SELECT '20261011000000_receive_transfer_items' AS migration, 'function' AS kind, 'receive_branch_transfer()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'receive_branch_transfer') AS present
  UNION ALL
  SELECT '20261011000000_receive_transfer_items' AS migration, 'function' AS kind, 'cancel_branch_transfer()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_branch_transfer') AS present
  UNION ALL
  SELECT '20261011000000_receive_transfer_items' AS migration, 'function' AS kind, 'cancel_branch_transfer_item()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cancel_branch_transfer_item') AS present
  UNION ALL
  SELECT '20261011000000_receive_transfer_items' AS migration, 'column' AS kind, 'branch_stock_transfer_items.received_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branch_stock_transfer_items' AND column_name = 'received_at') AS present
  UNION ALL
  SELECT '20261012000000_customer_due_reminders' AS migration, 'table' AS kind, 'customer_due_reminders' AS object, to_regclass('public.customer_due_reminders') IS NOT NULL AS present
  UNION ALL
  SELECT '20261014000000_orders_paid_at' AS migration, 'function' AS kind, 'set_orders_paid_at()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'set_orders_paid_at') AS present
  UNION ALL
  SELECT '20261014000000_orders_paid_at' AS migration, 'column' AS kind, 'orders.paid_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'paid_at') AS present
  UNION ALL
  SELECT '20261015000000_dashboard_profit_item_total_ratio' AS migration, 'function' AS kind, 'order_items_total()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'order_items_total') AS present
  UNION ALL
  SELECT '20261015000000_dashboard_profit_item_total_ratio' AS migration, 'function' AS kind, 'recompute_dashboard_daily_metrics()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_daily_metrics') AS present
  UNION ALL
  SELECT '20261015000000_dashboard_profit_item_total_ratio' AS migration, 'function' AS kind, 'recompute_dashboard_branch_daily()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'recompute_dashboard_branch_daily') AS present
  UNION ALL
  SELECT '20261016000000_branch_due_counts_settled_orders' AS migration, 'function' AS kind, 'get_branch_comparison()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_branch_comparison') AS present
  UNION ALL
  SELECT '20261020000000_pending_balance' AS migration, 'function' AS kind, 'is_ledger_settled_order()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'is_ledger_settled_order') AS present
  UNION ALL
  SELECT '20261020000000_pending_balance' AS migration, 'function' AS kind, 'get_pending_balance()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_pending_balance') AS present
  UNION ALL
  SELECT '20261021000000_branch_due_settled_by_payment' AS migration, 'function' AS kind, 'get_branch_comparison()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_branch_comparison') AS present
  UNION ALL
  SELECT '20261022000000_unique_customer_phone' AS migration, 'table' AS kind, 'store_customer_phone_merges' AS object, to_regclass('public.store_customer_phone_merges') IS NOT NULL AS present
  UNION ALL
  SELECT '20261022000000_unique_customer_phone' AS migration, 'table' AS kind, 'store_customer_phone_merge_rows' AS object, to_regclass('public.store_customer_phone_merge_rows') IS NOT NULL AS present
  UNION ALL
  SELECT '20261022000000_unique_customer_phone' AS migration, 'function' AS kind, 'normalize_phone()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'normalize_phone') AS present
  UNION ALL
  SELECT '20261022000000_unique_customer_phone' AS migration, 'function' AS kind, 'store_customers_normalize_phone()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'store_customers_normalize_phone') AS present
  UNION ALL
  SELECT '20261023000000_add_brands' AS migration, 'table' AS kind, 'brands' AS object, to_regclass('public.brands') IS NOT NULL AS present
  UNION ALL
  SELECT '20261023000000_add_brands' AS migration, 'column' AS kind, 'products.brand_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'brand_id') AS present
  UNION ALL
  SELECT '20261024000000_add_facebook_ads_connection' AS migration, 'column' AS kind, 'store_settings.facebook_ad_account_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'facebook_ad_account_id') AS present
  UNION ALL
  SELECT '20261024000000_add_facebook_ads_connection' AS migration, 'column' AS kind, 'store_settings.facebook_ads_access_token' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'facebook_ads_access_token') AS present
  UNION ALL
  SELECT '20261025000000_add_checkout_leads' AS migration, 'table' AS kind, 'checkout_leads' AS object, to_regclass('public.checkout_leads') IS NOT NULL AS present
  UNION ALL
  SELECT '20261026000000_move_delivered_order_branch' AS migration, 'function' AS kind, 'move_order_to_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'move_order_to_branch') AS present
  UNION ALL
  SELECT '20261026000100_hero_slide_button_options' AS migration, 'column' AS kind, 'store_hero_slides.button_position' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_hero_slides' AND column_name = 'button_position') AS present
  UNION ALL
  SELECT '20261026000100_hero_slide_button_options' AS migration, 'column' AS kind, 'store_hero_slides.button_new_tab' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_hero_slides' AND column_name = 'button_new_tab') AS present
  UNION ALL
  SELECT '20261027000000_add_product_in_stock' AS migration, 'function' AS kind, 'product_in_stock()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'product_in_stock') AS present
  UNION ALL
  SELECT '20261028000000_add_coupon_auto_apply' AS migration, 'column' AS kind, 'coupons.auto_apply' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'auto_apply') AS present
  UNION ALL
  SELECT '20261029000000_hero_slide_button_position_mobile' AS migration, 'column' AS kind, 'store_hero_slides.button_position_mobile' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_hero_slides' AND column_name = 'button_position_mobile') AS present
  UNION ALL
  SELECT '20261030000100_add_plan_price_half_yearly' AS migration, 'column' AS kind, 'subscription_plans.price_half_yearly' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'price_half_yearly') AS present
  UNION ALL
  SELECT '20261031000000_add_owner_withdrawals' AS migration, 'table' AS kind, 'owner_withdrawals' AS object, to_regclass('public.owner_withdrawals') IS NOT NULL AS present
  UNION ALL
  SELECT '20261101000000_add_suppliers' AS migration, 'table' AS kind, 'suppliers' AS object, to_regclass('public.suppliers') IS NOT NULL AS present
  UNION ALL
  SELECT '20261101000000_add_suppliers' AS migration, 'column' AS kind, 'products.supplier_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'supplier_id') AS present
  UNION ALL
  SELECT '20261102000000_owner_withdrawals_transfers' AS migration, 'column' AS kind, 'owner_withdrawals.kind' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'owner_withdrawals' AND column_name = 'kind') AS present
  UNION ALL
  SELECT '20261102000000_owner_withdrawals_transfers' AS migration, 'column' AS kind, 'owner_withdrawals.to_method' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'owner_withdrawals' AND column_name = 'to_method') AS present
  UNION ALL
  SELECT '20261103000000_add_supplier_ledger' AS migration, 'table' AS kind, 'supplier_ledger' AS object, to_regclass('public.supplier_ledger') IS NOT NULL AS present
  UNION ALL
  SELECT '20261104000000_add_customer_refunds' AS migration, 'table' AS kind, 'customer_refunds' AS object, to_regclass('public.customer_refunds') IS NOT NULL AS present
  UNION ALL
  SELECT '20261105000000_money_paid_from' AS migration, 'column' AS kind, 'supplier_ledger.paid_from' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_ledger' AND column_name = 'paid_from') AS present
  UNION ALL
  SELECT '20261105000000_money_paid_from' AS migration, 'column' AS kind, 'supplier_ledger.branch_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_ledger' AND column_name = 'branch_id') AS present
  UNION ALL
  SELECT '20261105000000_money_paid_from' AS migration, 'column' AS kind, 'expenses.paid_from' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'paid_from') AS present
  UNION ALL
  SELECT '20261106000000_vendor_returns_after_settlement' AS migration, 'function' AS kind, 'record_vendor_return()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_return') AS present
  UNION ALL
  SELECT '20261106000000_vendor_returns_after_settlement' AS migration, 'function' AS kind, 'record_vendor_return_at_branch()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_vendor_return_at_branch') AS present
  UNION ALL
  SELECT '20261106000000_vendor_returns_after_settlement' AS migration, 'function' AS kind, 'delete_vendor_settlement()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'delete_vendor_settlement') AS present
  UNION ALL
  SELECT '20261107000000_add_customer_memberships' AS migration, 'table' AS kind, 'membership_plans' AS object, to_regclass('public.membership_plans') IS NOT NULL AS present
  UNION ALL
  SELECT '20261107000000_add_customer_memberships' AS migration, 'table' AS kind, 'membership_plan_benefits' AS object, to_regclass('public.membership_plan_benefits') IS NOT NULL AS present
  UNION ALL
  SELECT '20261107000000_add_customer_memberships' AS migration, 'table' AS kind, 'customer_memberships' AS object, to_regclass('public.customer_memberships') IS NOT NULL AS present
  UNION ALL
  SELECT '20261108000000_add_order_membership_discount' AS migration, 'column' AS kind, 'orders.membership_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'membership_id') AS present
  UNION ALL
  SELECT '20261108000000_add_order_membership_discount' AS migration, 'column' AS kind, 'orders.membership_discount' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'membership_discount') AS present
  UNION ALL
  SELECT '20261109000000_add_category_show_in_store' AS migration, 'column' AS kind, 'categories.show_in_store' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'show_in_store') AS present
  UNION ALL
  SELECT '20261110000000_add_membership_auto_level' AS migration, 'column' AS kind, 'membership_plans.min_spend' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'membership_plans' AND column_name = 'min_spend') AS present
  UNION ALL
  SELECT '20261110000000_add_membership_auto_level' AS migration, 'column' AS kind, 'membership_plans.number_prefix' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'membership_plans' AND column_name = 'number_prefix') AS present
  UNION ALL
  SELECT '20261110000000_add_membership_auto_level' AS migration, 'column' AS kind, 'customer_memberships.source' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_memberships' AND column_name = 'source') AS present
  UNION ALL
  SELECT '20261111000000_add_membership_card_design' AS migration, 'table' AS kind, 'membership_card_designs' AS object, to_regclass('public.membership_card_designs') IS NOT NULL AS present
  UNION ALL
  SELECT '20261111000000_add_membership_card_design' AS migration, 'column' AS kind, 'customer_memberships.welcome_email_to' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_memberships' AND column_name = 'welcome_email_to') AS present
  UNION ALL
  SELECT '20261111000000_add_membership_card_design' AS migration, 'column' AS kind, 'customer_memberships.welcome_email_sent_at' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_memberships' AND column_name = 'welcome_email_sent_at') AS present
  UNION ALL
  SELECT '20261111000000_add_membership_card_design' AS migration, 'column' AS kind, 'customer_memberships.welcome_email_error' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_memberships' AND column_name = 'welcome_email_error') AS present
  UNION ALL
  SELECT '20261113000000_accrual_statements' AS migration, 'function' AS kind, 'get_profit_loss_accrual()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_profit_loss_accrual') AS present
  UNION ALL
  SELECT '20261113000000_accrual_statements' AS migration, 'function' AS kind, 'get_balance_snapshot()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_balance_snapshot') AS present
  UNION ALL
  SELECT '20261114000000_add_purchases' AS migration, 'table' AS kind, 'purchases' AS object, to_regclass('public.purchases') IS NOT NULL AS present
  UNION ALL
  SELECT '20261114000000_add_purchases' AS migration, 'table' AS kind, 'purchase_items' AS object, to_regclass('public.purchase_items') IS NOT NULL AS present
  UNION ALL
  SELECT '20261114000000_add_purchases' AS migration, 'function' AS kind, 'receive_purchase()' AS object, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'receive_purchase') AS present
  UNION ALL
  SELECT '20261114000000_add_purchases' AS migration, 'column' AS kind, 'suppliers.payment_terms_days' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'payment_terms_days') AS present
  UNION ALL
  SELECT '20261114000000_add_purchases' AS migration, 'column' AS kind, 'supplier_ledger.purchase_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_ledger' AND column_name = 'purchase_id') AS present
  UNION ALL
  SELECT '20261114000000_add_purchases' AS migration, 'column' AS kind, 'stock_movements.purchase_id' AS object, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'purchase_id') AS present
)
SELECT migration,
       count(*) FILTER (WHERE NOT present) AS missing,
       count(*) AS checked,
       string_agg(object, ', ' ORDER BY kind, object) FILTER (WHERE NOT present) AS missing_objects
FROM checks
GROUP BY migration
HAVING count(*) FILTER (WHERE NOT present) > 0
ORDER BY migration;
