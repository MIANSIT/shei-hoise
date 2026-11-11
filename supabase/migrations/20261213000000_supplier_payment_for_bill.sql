-- A supplier payment can name the bill it pays.
--
-- supplier_ledger.for_bill_id on a payment = the bill (another supplier_ledger row, kind 'bill') it pays. That bill
-- is paid by it first (up to the bill's amount); anything above the bill, and every payment with no bill named,
-- is applied to the supplier's oldest bills as before.
--
-- Additive and safe to apply before the code ships: every existing payment keeps NULL.

ALTER TABLE "public"."supplier_ledger"
  ADD COLUMN IF NOT EXISTS "for_bill_id" uuid REFERENCES "public"."supplier_ledger"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "supplier_ledger_for_bill_idx" ON "public"."supplier_ledger" ("for_bill_id") WHERE "for_bill_id" IS NOT NULL;

NOTIFY pgrst, 'reload schema';
