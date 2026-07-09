-- ============================================================
-- Load public schema data into new Supabase project
--
-- Uses session_replication_role = replica to bypass all FK
-- and trigger constraints during the load (handles circular
-- FK dependencies like store_customers <-> customer_profiles
-- and stores <-> users).
--
-- subscription_plans and store_subscriptions are NOT touched
-- (they don't exist in the old project's dump).
-- ============================================================

-- Disable FK/trigger enforcement for this session
SET session_replication_role = replica;

-- Truncate all 21 original tables (preserving subscription tables)
TRUNCATE TABLE
  public.wishlists,
  public.cart_items,
  public.carts,
  public.order_tracking,
  public.order_items,
  public.orders,
  public.store_reviews,
  public.product_reviews,
  public.product_inventory,
  public.product_images,
  public.product_variants,
  public.products,
  public.categories,
  public.store_customer_links,
  public.customer_profiles,
  public.store_customers,
  public.store_settings,
  public.contact_us,
  public.user_profiles,
  public.stores,
  public.users
RESTART IDENTITY;

-- Load all data from old project dump
\i /Users/samin/Projects/shei-hoise/migration_dump/public_data.sql

-- Re-enable FK/trigger enforcement
SET session_replication_role = DEFAULT;

-- Quick sanity check
SELECT table_name,
       (xpath('/row/c/text()',
         query_to_xml(format('SELECT COUNT(*) AS c FROM public.%I', table_name),
         false, true, '')))[1]::text::int AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('subscription_plans','store_subscriptions')
ORDER BY table_name;
