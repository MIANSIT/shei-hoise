-- COD settlements: how the courier paid the shop.
--
-- A courier payout can arrive as cash, on bKash / Nagad, or into the bank. The settlement now says which,
-- so the money lands on that balance (Money Overview, Cash & bank) and only cash settlements are added to
-- the Register Audit's expected cash.
--
-- Additive: one nullable column. Settlements saved before this have no method and keep counting as cash
-- in the Register Audit, as before.

ALTER TABLE "public"."store_cod_settlements"
  ADD COLUMN IF NOT EXISTS "payment_method" text;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_cod_settlements"
    ADD CONSTRAINT "store_cod_settlements_method_check"
    CHECK ("payment_method" IS NULL OR "payment_method" IN ('cash', 'mobile_banking', 'bank_transfer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
