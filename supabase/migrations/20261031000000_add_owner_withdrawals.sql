-- Money the owner takes out of the business for themselves (cash from the
-- drawer, a bKash or bank transfer to a personal account). It is NOT an
-- expense: it never touches sales, cost or profit, only how much money the
-- business still holds. The Money Overview page shows received minus
-- withdrawn per payment method.
--
-- Writes go through supabaseAdmin in owner-only server actions; the SELECT
-- policy lets only the store owner read the rows (staff never see withdrawals).
CREATE TABLE IF NOT EXISTS "public"."owner_withdrawals" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_method" text DEFAULT 'cash' NOT NULL,
    "withdrawal_date" date NOT NULL,
    "notes" text,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "owner_withdrawals_amount_check" CHECK ("amount" > 0)
);
ALTER TABLE "public"."owner_withdrawals" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "owner_withdrawals_store_date_idx"
  ON "public"."owner_withdrawals" ("store_id", "withdrawal_date" DESC);

GRANT ALL ON TABLE "public"."owner_withdrawals" TO "service_role";
GRANT SELECT ON TABLE "public"."owner_withdrawals" TO "authenticated";

ALTER TABLE "public"."owner_withdrawals" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_withdrawals_owner_select" ON "public"."owner_withdrawals";
CREATE POLICY "owner_withdrawals_owner_select" ON "public"."owner_withdrawals" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid()
      AND u."store_id" = "owner_withdrawals"."store_id"
      AND u."user_type" = 'store_owner'
  )
);
