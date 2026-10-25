-- Adds a 6-month billing option. billing_cycle is a Postgres enum shared by
-- store_subscriptions and subscription_invoices, so the new value covers both.
--
-- ALTER TYPE ... ADD VALUE cannot run inside the same transaction as other
-- statements that use the new value — apply this migration by itself, and
-- BEFORE deploying the code that lets stores pick the 6-month cycle (a
-- half_yearly purchase fails with "invalid input value for enum" until then).
ALTER TYPE "public"."billing_cycle" ADD VALUE IF NOT EXISTS 'half_yearly' AFTER 'monthly';
