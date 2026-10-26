-- Where the money for an expense or a supplier payment came from, so Money
-- Overview only takes it off the shop's own cash / bKash balance when it
-- really came from there.
--
--   paid_from = 'shop'     paid out of the shop's money (counted: reduces the
--                          balance of the payment method, on that day)
--   paid_from = 'outside'  paid by an investor or from the owner's own pocket
--                          (not counted: the shop's balance did not change)
--   paid_from = NULL       entered before this existed: not counted, so past
--                          balances do not suddenly change
--
-- Supplier payments also record the branch they were paid from, so a branch's
-- own balance is right. Bills are goods bought on credit, not money leaving,
-- so they never need either field.
--
-- Requires 20261103000000_add_supplier_ledger.sql and the branch tables
-- (20261002000000). Additive: nullable columns, nothing existing changes.
ALTER TABLE "public"."supplier_ledger"
  ADD COLUMN IF NOT EXISTS "paid_from" text,
  ADD COLUMN IF NOT EXISTS "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;

ALTER TABLE "public"."expenses"
  ADD COLUMN IF NOT EXISTS "paid_from" text;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."supplier_ledger"
    ADD CONSTRAINT "supplier_ledger_paid_from_check" CHECK ("paid_from" IN ('shop', 'outside'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_paid_from_check" CHECK ("paid_from" IN ('shop', 'outside'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "supplier_ledger_branch_idx"
  ON "public"."supplier_ledger" ("store_id", "branch_id", "entry_date");
