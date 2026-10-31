-- Records which membership gave an order a discount, and how much of the
-- order's discount_amount that was. discount_amount stays the order's whole
-- discount (so every total and report that already reads it stays right);
-- membership_discount is the part of it that came from the customer's
-- membership, so receipts and invoices can show it on its own line.
--
-- Requires 20261107000000_add_customer_memberships.sql. Additive: a nullable
-- column and one with a default, so existing rows and running code are
-- untouched. Apply this BEFORE deploying the code that writes them.
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "membership_id" uuid REFERENCES "public"."customer_memberships"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "membership_discount" numeric(12,2) DEFAULT 0 NOT NULL;
