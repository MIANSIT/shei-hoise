-- A Quick Sale can be paid partly by one method and partly by another (e.g. some cash, the rest by bKash).
--
-- orders.payment_split = how the money taken at the sale was split: a JSON array of {"method": text, "amount": number},
-- e.g. [{"method":"cash","amount":500},{"method":"mobile_banking","amount":300}]. Only read when payment_method is
-- 'split'; every other order keeps NULL. A fully-paid split sale's parts add up to its total_amount; on a due split
-- sale they add up to what was received at the counter (each part is also its own customer_payments row).
--
-- Additive and safe to apply before the code ships: every existing order keeps NULL.

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "payment_split" jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_split_array_check') THEN
    ALTER TABLE "public"."orders"
      ADD CONSTRAINT "orders_payment_split_array_check"
      CHECK ("payment_split" IS NULL OR jsonb_typeof("payment_split") = 'array');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
