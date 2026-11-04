-- Supplier bills by branch (stores with branches).
--
-- A bill belongs to the branch that received the goods (purchases.branch_id, or supplier_ledger.branch_id
-- on a bill typed by hand). A payment names the branch whose bills it pays: this adds that choice.
--   bill_branch_id  the branch whose bills this payment (or credit) is applied to. NULL = not tied to a
--                   branch: it is applied to the supplier's oldest bills in any branch.
-- The money itself stays per branch as before (supplier_ledger.branch_id on a payment from the shop's
-- money = the branch whose cash, bank or bKash went down). So branch A's money can pay branch B's bills.
--
-- Without this column the app falls back: a payment from the shop's money is applied to the bills of the
-- branch whose money paid it. Additive: one nullable column.
-- Requires 20261103000000_add_supplier_ledger.sql, 20261105000000_money_paid_from.sql and the branch tables.
ALTER TABLE "public"."supplier_ledger"
  ADD COLUMN IF NOT EXISTS "bill_branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "supplier_ledger_bill_branch_idx"
  ON "public"."supplier_ledger" ("store_id", "supplier_id", "bill_branch_id");
