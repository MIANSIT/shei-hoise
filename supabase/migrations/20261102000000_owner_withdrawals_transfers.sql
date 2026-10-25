-- Moving money between payment methods, e.g. cashing out bKash or a card
-- balance to cash. It is NOT a withdrawal: the money stays in the business,
-- only the method it sits in changes. Stored in the same table as owner
-- withdrawals, with a kind, so one list and one delete cover both.
--
--   kind = 'withdrawal'  payment_method = where it came out of (leaves the business)
--   kind = 'transfer'    payment_method = moved FROM, to_method = moved TO
--
-- Requires 20261031000000_add_owner_withdrawals.sql. Additive: existing rows
-- are withdrawals and stay that way.
ALTER TABLE "public"."owner_withdrawals"
  ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'withdrawal' NOT NULL,
  ADD COLUMN IF NOT EXISTS "to_method" text;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."owner_withdrawals"
    ADD CONSTRAINT "owner_withdrawals_kind_check"
    CHECK (
      ("kind" = 'withdrawal' AND "to_method" IS NULL)
      OR ("kind" = 'transfer' AND "to_method" IS NOT NULL AND "to_method" <> "payment_method")
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
