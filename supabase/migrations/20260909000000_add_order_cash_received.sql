-- Persists what the cashier actually collected in cash for a Quick Sale
-- (POS) order paid in full on the spot, so "Cash received" / "Change due"
-- on the printed receipt can be reconstructed later -- e.g. reprinting
-- after a page reload wiped the in-memory sale state -- instead of being
-- lost forever, which is what happened before this column existed. Null
-- for every other order: due sales, card/mobile-banking payments, and all
-- online-channel orders.
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "cash_received" numeric(10,2);
