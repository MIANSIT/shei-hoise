-- Who put their own money into the business, and how it counts.
--
-- Until now an expense or supplier payment could be marked "paid from outside"
-- (an investor or the owner's own pocket), which only kept it off the shop's
-- cash balance. It did not say WHO paid, and did not say whether that money is
-- the person's capital or a loan the business must pay back.
--
--   money_partners  the owner and any investors, one row each.
--   funder_id / funder_treatment (on expenses and supplier_ledger)
--       set only when paid_from = 'outside':
--         capital  the person put that money in; it is theirs in the business
--         loan     the business owes them that money back
--   money_entries.partner_id
--       the person behind a Money Book entry: owner_investment (capital),
--       loan_received (a loan from them) or loan_repayment (paying them back).
--
-- Per person: capital = outside payments counted as capital + owner_investment
-- entries; owed = outside payments counted as loan + loan_received entries
-- - loan_repayment entries.
--
-- Additive: one new table and nullable columns. Old rows stay as they were
-- (an outside payment with no treatment keeps working exactly as before).
-- Writes go through server actions (supabaseAdmin); the SELECT policy lets only
-- the store owner read partners directly.
--
-- Requires 20261105000000_money_paid_from.sql and 20261115000000_add_money_book.sql.

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
  ADD COLUMN IF NOT EXISTS "funder_id" uuid REFERENCES "public"."money_partners"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "funder_treatment" text;
ALTER TABLE "public"."supplier_ledger"
  ADD COLUMN IF NOT EXISTS "funder_id" uuid REFERENCES "public"."money_partners"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "funder_treatment" text;
ALTER TABLE "public"."money_entries"
  ADD COLUMN IF NOT EXISTS "partner_id" uuid REFERENCES "public"."money_partners"("id") ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_funder_treatment_check" CHECK ("funder_treatment" IN ('capital', 'loan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ONLY "public"."supplier_ledger"
    ADD CONSTRAINT "supplier_ledger_funder_treatment_check" CHECK ("funder_treatment" IN ('capital', 'loan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
