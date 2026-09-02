-- Ledger for "due" / store-credit sales (Quick Sale walk-in customers who
-- pay part or none of the total up front). Mirrors vendor_payments'
-- shape/RLS exactly (see 20260711000000_add_vendor_distribution_module.sql
-- and 20260712000000_add_vendor_tables_rls.sql) -- due is never stored as a
-- column, it's always orders.total_amount minus the sum of payments here,
-- the same "ledger, not a mutable balance field" approach already proven
-- for vendor dues.
CREATE TABLE IF NOT EXISTS "public"."customer_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_method" "text" DEFAULT 'cash'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "customer_payments_amount_check" CHECK ("amount" > 0)
);
ALTER TABLE "public"."customer_payments" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."customer_payments"
    ADD CONSTRAINT "customer_payments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."customer_payments"
    ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."customer_payments"
    ADD CONSTRAINT "customer_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."customer_payments"
    ADD CONSTRAINT "customer_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "customer_payments_customer_id_idx" ON "public"."customer_payments" ("customer_id");
CREATE INDEX IF NOT EXISTS "customer_payments_order_id_idx" ON "public"."customer_payments" ("order_id");
CREATE INDEX IF NOT EXISTS "customer_payments_payment_date_idx" ON "public"."customer_payments" ("payment_date" DESC);

GRANT ALL ON TABLE "public"."customer_payments" TO "service_role";
GRANT ALL ON TABLE "public"."customer_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_payments" TO "anon";

-- All writes go through supabaseAdmin (service_role, bypasses RLS) inside
-- "use server" functions, same as vendor_payments -- so only a SELECT
-- policy is needed; direct writes from the browser's anon/authenticated
-- client are denied by default with RLS on and no write policy.
ALTER TABLE "public"."customer_payments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_payments_owner_select" ON "public"."customer_payments";
CREATE POLICY "customer_payments_owner_select" ON "public"."customer_payments" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);
