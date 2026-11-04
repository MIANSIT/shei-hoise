-- Returning goods to a supplier: a credit on the supplier's account.
--
-- When goods go back to a supplier, the stock goes down and the supplier credits the shop: what
-- the shop owes them falls, but no money moves. That is a third kind of supplier ledger entry,
-- "credit". It lowers Accounts payable and is applied to the supplier's oldest bills like a
-- payment, but it is not a payment: it is not counted as money spent and does not touch cash.
--
-- supplier_ledger_kind_check allowed only 'bill' and 'payment'; this adds 'credit'. Every place
-- that adds up a supplier's balance already treats anything that is not a bill as reducing it,
-- and the places that count money spent only read kind = 'payment'.
--
-- Additive: widens one CHECK constraint, existing rows are unaffected.
-- Requires 20261103000000_add_supplier_ledger.sql.
ALTER TABLE "public"."supplier_ledger" DROP CONSTRAINT IF EXISTS "supplier_ledger_kind_check";
ALTER TABLE "public"."supplier_ledger"
  ADD CONSTRAINT "supplier_ledger_kind_check" CHECK ("kind" IN ('bill', 'payment', 'credit'));
