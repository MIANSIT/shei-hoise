-- Investor money: replaces the Money Book with two pockets that never mix.
--
--   Business cash      money the business made from sales. It starts from the starting cash
--                      and moves with sales, expenses, supplier payments and refunds.
--   Investor account   money people put in (a loan, or an investment). Only payments you
--                      choose to pay "from the Investor account" take money out of it.
--
-- Sales and profit read orders and expenses only, so neither pocket can change them.
--
--   money_start       the starting cash of a store (per payment method, per branch for stores
--                     with branches) and the day it was counted. The earliest date is the day the
--                     new system was switched on: Money Book records before it are hidden and not
--                     counted. A new store saves it when the store is created.
--   investor_deals    money from one person, of one kind:
--                       loan          repaid in parts, interest optional
--                       profit_share  the person gets profit_share_pct % of the profit
--                       payback       paid back in any amount; the capital left is shown
--   investor_entries  what happened on a deal:
--                       put_in             the person gave money (raises the Investor account)
--                       repay              loan principal paid back
--                       pay_back           investment paid back (lowers the investor's capital)
--                       profit_share_paid  a profit share paid for period_month (YYYY-MM)
--                     pay_from says which pocket paid ('business' or 'investor'); method and
--                     branch say which business balance goes down when the business paid.
--
-- A payment from the Investor account for an expense or supplier bill keeps using the existing
-- paid_from = 'outside' and funder_id columns. Those, and the people table (money_partners), are created below
-- when they are missing, so this file does not depend on the Money Book migrations (20261115, 20261116).
--
-- Additive: three new tables, nothing existing changes. Writes go through owner-only server
-- actions (supabaseAdmin); the SELECT policies let only the store owner read the rows, like
-- money_partners. Requires 20261105000000_money_paid_from.sql (paid_from on expenses and supplier payments).

-- The people who put money in (the owner and investors), and who paid an expense or a supplier bill from the
-- Investor account. Same definitions as 20261116000000_add_money_partners.sql, all IF NOT EXISTS, so it is safe
-- whether or not that migration was applied.
CREATE TABLE IF NOT EXISTS "public"."money_partners" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "kind" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "money_partners_kind_check" CHECK ("kind" IN ('owner', 'investor')),
    CONSTRAINT "money_partners_name_check" CHECK (length(btrim("name")) > 0)
);
ALTER TABLE "public"."money_partners" OWNER TO "postgres";
CREATE UNIQUE INDEX IF NOT EXISTS "money_partners_store_name_uidx"
  ON "public"."money_partners" ("store_id", lower("name"));
GRANT ALL ON TABLE "public"."money_partners" TO "service_role";
GRANT SELECT ON TABLE "public"."money_partners" TO "authenticated";
ALTER TABLE "public"."money_partners" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "money_partners_owner_select" ON "public"."money_partners";
CREATE POLICY "money_partners_owner_select" ON "public"."money_partners" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "money_partners"."store_id" AND u."user_type" = 'store_owner'
  )
);

ALTER TABLE "public"."expenses"
  ADD COLUMN IF NOT EXISTS "paid_from" text,
  ADD COLUMN IF NOT EXISTS "funder_id" uuid REFERENCES "public"."money_partners"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "funder_treatment" text;
ALTER TABLE "public"."supplier_ledger"
  ADD COLUMN IF NOT EXISTS "paid_from" text,
  ADD COLUMN IF NOT EXISTS "funder_id" uuid REFERENCES "public"."money_partners"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "funder_treatment" text;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_funder_treatment_check" CHECK ("funder_treatment" IN ('capital', 'loan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."supplier_ledger"
    ADD CONSTRAINT "supplier_ledger_funder_treatment_check" CHECK ("funder_treatment" IN ('capital', 'loan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."money_start" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "method" text NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "as_of_date" date NOT NULL,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "money_start_method_check" CHECK ("method" IN ('cash', 'mobile_banking', 'bank_transfer')),
    CONSTRAINT "money_start_amount_check" CHECK ("amount" >= 0)
);
ALTER TABLE "public"."money_start" OWNER TO "postgres";
CREATE UNIQUE INDEX IF NOT EXISTS "money_start_uidx"
  ON "public"."money_start" ("store_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid), "method");

CREATE TABLE IF NOT EXISTS "public"."investor_deals" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "partner_id" uuid NOT NULL REFERENCES "public"."money_partners"("id") ON DELETE CASCADE,
    "kind" text NOT NULL,
    "profit_share_pct" numeric(5,2),
    "note" text,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "investor_deals_kind_check" CHECK ("kind" IN ('loan', 'profit_share', 'payback')),
    CONSTRAINT "investor_deals_pct_check" CHECK (
      ("kind" = 'profit_share' AND "profit_share_pct" IS NOT NULL AND "profit_share_pct" > 0 AND "profit_share_pct" <= 100)
      OR ("kind" <> 'profit_share' AND "profit_share_pct" IS NULL)
    )
);
ALTER TABLE "public"."investor_deals" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "investor_deals_store_idx" ON "public"."investor_deals" ("store_id", "partner_id");

CREATE TABLE IF NOT EXISTS "public"."investor_entries" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "deal_id" uuid NOT NULL REFERENCES "public"."investor_deals"("id") ON DELETE CASCADE,
    "entry_type" text NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "entry_date" date NOT NULL,
    "pay_from" text,
    "payment_method" text,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL,
    "period_month" text,
    "note" text,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "investor_entries_type_check" CHECK ("entry_type" IN ('put_in', 'repay', 'pay_back', 'profit_share_paid')),
    CONSTRAINT "investor_entries_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "investor_entries_pay_from_check" CHECK (
      ("entry_type" = 'put_in' AND "pay_from" IS NULL)
      OR ("entry_type" <> 'put_in' AND "pay_from" IN ('business', 'investor'))
    ),
    CONSTRAINT "investor_entries_method_check" CHECK ("payment_method" IS NULL OR "payment_method" IN ('cash', 'mobile_banking', 'bank_transfer')),
    CONSTRAINT "investor_entries_month_check" CHECK (
      ("entry_type" = 'profit_share_paid' AND "period_month" ~ '^\d{4}-\d{2}$')
      OR ("entry_type" <> 'profit_share_paid' AND "period_month" IS NULL)
    )
);
ALTER TABLE "public"."investor_entries" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "investor_entries_store_date_idx" ON "public"."investor_entries" ("store_id", "entry_date" DESC, "created_at" DESC);
CREATE INDEX IF NOT EXISTS "investor_entries_deal_idx" ON "public"."investor_entries" ("deal_id");

GRANT ALL ON TABLE "public"."money_start" TO "service_role";
GRANT ALL ON TABLE "public"."investor_deals" TO "service_role";
GRANT ALL ON TABLE "public"."investor_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."money_start" TO "authenticated";
GRANT SELECT ON TABLE "public"."investor_deals" TO "authenticated";
GRANT SELECT ON TABLE "public"."investor_entries" TO "authenticated";

ALTER TABLE "public"."money_start" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."investor_deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."investor_entries" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "money_start_owner_select" ON "public"."money_start";
CREATE POLICY "money_start_owner_select" ON "public"."money_start" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "money_start"."store_id" AND u."user_type" = 'store_owner'
  )
);
DROP POLICY IF EXISTS "investor_deals_owner_select" ON "public"."investor_deals";
CREATE POLICY "investor_deals_owner_select" ON "public"."investor_deals" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "investor_deals"."store_id" AND u."user_type" = 'store_owner'
  )
);
DROP POLICY IF EXISTS "investor_entries_owner_select" ON "public"."investor_entries";
CREATE POLICY "investor_entries_owner_select" ON "public"."investor_entries" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "investor_entries"."store_id" AND u."user_type" = 'store_owner'
  )
);

-- A closed month stays closed: investor entries dated in it cannot be added, changed or deleted until the
-- month is reopened (same rule as expenses and supplier payments, 20261121000000_lock_closed_months.sql).
-- The lock goes on only when both of its functions exist; otherwise any lock left on the table is taken off, so a
-- database without that migration never fails when money is added.
DO $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS "trg_closed_period" ON "public"."investor_entries"';
  IF to_regprocedure('public.enforce_closed_period()') IS NOT NULL
     AND to_regprocedure('public.is_period_closed(uuid, uuid, date)') IS NOT NULL THEN
    EXECUTE 'CREATE TRIGGER "trg_closed_period" BEFORE INSERT OR UPDATE OR DELETE ON "public"."investor_entries" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_closed_period"(''entry_date'')';
  END IF;
END $$;
