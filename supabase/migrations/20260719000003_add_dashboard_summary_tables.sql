-- Dashboard summary tables: pre-aggregated rollups kept current by triggers
-- (see 20260719000004/20260719000005), read back through the single
-- get_dashboard_summary RPC (20260719000006). Replaces 3 full-table client
-- fetches (all orders, all products, up to 10k expenses) plus an ~830-line
-- client-side recompute-from-scratch hook that re-ran on every dashboard
-- load regardless of how much order history a store had accumulated.
--
-- Split into five tables by how often each needs to be fresh: money/status/
-- payment metrics are day-summable and can lag by however long a trigger
-- takes to run (effectively instant); inventory has no time dimension and
-- must stay live. No anon/authenticated policies on any of these — the
-- dashboard reads exclusively through get_dashboard_summary() (SECURITY
-- DEFINER), which checks store ownership itself before returning anything.

CREATE TABLE IF NOT EXISTS "public"."dashboard_daily_metrics" (
    "store_id" "uuid" NOT NULL,
    "summary_date" "date" NOT NULL,
    "orders_count" integer DEFAULT 0 NOT NULL,
    "order_value_sum" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_orders_count" integer DEFAULT 0 NOT NULL,
    "paid_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "gross_profit" numeric(12,2) DEFAULT 0 NOT NULL,
    "status_pending" integer DEFAULT 0 NOT NULL,
    "status_confirmed" integer DEFAULT 0 NOT NULL,
    "status_shipped" integer DEFAULT 0 NOT NULL,
    "status_delivered" integer DEFAULT 0 NOT NULL,
    "status_cancelled" integer DEFAULT 0 NOT NULL,
    "payment_pending_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_paid_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_refunded_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_pending_count" integer DEFAULT 0 NOT NULL,
    "payment_paid_count" integer DEFAULT 0 NOT NULL,
    "payment_refunded_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id", "summary_date")
);
ALTER TABLE "public"."dashboard_daily_metrics" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_daily_metrics" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_daily_metrics"
    ADD CONSTRAINT "dashboard_daily_metrics_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."dashboard_daily_product_summary" (
    "store_id" "uuid" NOT NULL,
    "summary_date" "date" NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id", "summary_date", "product_name")
);
ALTER TABLE "public"."dashboard_daily_product_summary" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_daily_product_summary" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_daily_product_summary"
    ADD CONSTRAINT "dashboard_daily_product_summary_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."dashboard_customer_summary" (
    "store_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "first_order_date" "date" NOT NULL,
    "total_orders" integer DEFAULT 0 NOT NULL,
    "paid_total_spent" numeric(12,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id", "customer_id")
);
ALTER TABLE "public"."dashboard_customer_summary" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_customer_summary" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_customer_summary"
    ADD CONSTRAINT "dashboard_customer_summary_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_customer_summary"
    ADD CONSTRAINT "dashboard_customer_summary_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."dashboard_daily_expense_category_summary" (
    "store_id" "uuid" NOT NULL,
    "summary_date" "date" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "expense_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id", "summary_date", "category_id")
);
ALTER TABLE "public"."dashboard_daily_expense_category_summary" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_daily_expense_category_summary" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_daily_expense_category_summary"
    ADD CONSTRAINT "dashboard_daily_expense_category_summary_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_daily_expense_category_summary"
    ADD CONSTRAINT "dashboard_daily_expense_category_summary_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."dashboard_inventory_summary" (
    "store_id" "uuid" NOT NULL,
    "in_stock_units" integer DEFAULT 0 NOT NULL,
    "low_stock_product_count" integer DEFAULT 0 NOT NULL,
    "out_of_stock_product_count" integer DEFAULT 0 NOT NULL,
    "partially_out_of_stock_product_count" integer DEFAULT 0 NOT NULL,
    "total_inventory_value" numeric(14,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("store_id")
);
ALTER TABLE "public"."dashboard_inventory_summary" OWNER TO "postgres";
ALTER TABLE "public"."dashboard_inventory_summary" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."dashboard_inventory_summary"
    ADD CONSTRAINT "dashboard_inventory_summary_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "dashboard_daily_metrics_store_date_idx" ON "public"."dashboard_daily_metrics" ("store_id", "summary_date");
CREATE INDEX IF NOT EXISTS "dashboard_daily_product_summary_store_date_idx" ON "public"."dashboard_daily_product_summary" ("store_id", "summary_date");
CREATE INDEX IF NOT EXISTS "dashboard_customer_summary_store_idx" ON "public"."dashboard_customer_summary" ("store_id", "first_order_date");
CREATE INDEX IF NOT EXISTS "dashboard_daily_expense_category_summary_store_date_idx" ON "public"."dashboard_daily_expense_category_summary" ("store_id", "summary_date");

GRANT ALL ON TABLE "public"."dashboard_daily_metrics" TO "service_role";
GRANT ALL ON TABLE "public"."dashboard_daily_product_summary" TO "service_role";
GRANT ALL ON TABLE "public"."dashboard_customer_summary" TO "service_role";
GRANT ALL ON TABLE "public"."dashboard_daily_expense_category_summary" TO "service_role";
GRANT ALL ON TABLE "public"."dashboard_inventory_summary" TO "service_role";
