-- Money Book: the starting balances and the money-in / money-out types the
-- Money Overview page did not have, so Cash & bank can be shown on the
-- Balance tab and the books balance.
--
--   money_opening_balances  what the business held on a start date: money per
--                           payment method, plus the equipment it already owned
--                           and the loans it already owed (per branch for stores
--                           with branches). Money Overview only counts what moved
--                           in a period; this is the number it starts from.
--   money_entries           money in or out that is neither a sale nor an
--                           expense, with a type that says what it was for:
--                             in : owner_investment, loan_received, other_income, cash_over
--                             out: loan_repayment, equipment_purchase, cash_short
--                           cash_over / cash_short come from the daily cash
--                           count (counted cash minus what the books expected).
--
-- What each type does to the books (the app works these out from the rows):
--   owner_investment   cash up, owner's capital up       no profit change
--   loan_received      cash up, loans up                 no profit change
--   other_income       cash up, equity up                no profit change here
--   loan_repayment     cash down, loans down             no profit change
--   equipment_purchase cash down, fixed assets up        no profit change
--   cash_over/short    cash up/down, equity up/down      no profit change here
--
-- Additive: two new tables, nothing existing changes. Writes go through
-- owner-only server actions (supabaseAdmin); the SELECT policies let only the
-- store owner read the rows, like owner_withdrawals.

CREATE TABLE IF NOT EXISTS "public"."money_opening_balances" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "line" text NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "as_of_date" date NOT NULL,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "money_opening_balances_line_check"
      CHECK ("line" IN ('cash', 'mobile_banking', 'card', 'bank_transfer', 'online', 'other', 'fixed_assets', 'loans')),
    CONSTRAINT "money_opening_balances_amount_check" CHECK ("amount" >= 0)
);
ALTER TABLE "public"."money_opening_balances" OWNER TO "postgres";

-- One opening balance per store, branch and line (a store without branches has branch_id NULL).
CREATE UNIQUE INDEX IF NOT EXISTS "money_opening_balances_uidx"
  ON "public"."money_opening_balances" ("store_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid), "line");

CREATE TABLE IF NOT EXISTS "public"."money_entries" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL,
    "kind" text NOT NULL,
    "entry_type" text NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "payment_method" text DEFAULT 'cash' NOT NULL,
    "entry_date" date NOT NULL,
    "note" text,
    "meta" jsonb,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "money_entries_kind_check" CHECK ("kind" IN ('in', 'out')),
    CONSTRAINT "money_entries_type_check" CHECK (
      ("kind" = 'in' AND "entry_type" IN ('owner_investment', 'loan_received', 'other_income', 'cash_over'))
      OR ("kind" = 'out' AND "entry_type" IN ('loan_repayment', 'equipment_purchase', 'cash_short'))
    ),
    CONSTRAINT "money_entries_method_check"
      CHECK ("payment_method" IN ('cash', 'mobile_banking', 'card', 'bank_transfer', 'online', 'other')),
    CONSTRAINT "money_entries_amount_check" CHECK ("amount" > 0)
);
ALTER TABLE "public"."money_entries" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "money_entries_store_date_idx"
  ON "public"."money_entries" ("store_id", "entry_date" DESC, "created_at" DESC);

GRANT ALL ON TABLE "public"."money_opening_balances" TO "service_role";
GRANT ALL ON TABLE "public"."money_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."money_opening_balances" TO "authenticated";
GRANT SELECT ON TABLE "public"."money_entries" TO "authenticated";

ALTER TABLE "public"."money_opening_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."money_entries" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "money_opening_balances_owner_select" ON "public"."money_opening_balances";
CREATE POLICY "money_opening_balances_owner_select" ON "public"."money_opening_balances" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "money_opening_balances"."store_id" AND u."user_type" = 'store_owner'
  )
);
DROP POLICY IF EXISTS "money_entries_owner_select" ON "public"."money_entries";
CREATE POLICY "money_entries_owner_select" ON "public"."money_entries" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "money_entries"."store_id" AND u."user_type" = 'store_owner'
  )
);
