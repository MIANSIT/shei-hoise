-- Gives a membership level an optional spend target. A customer whose total
-- shopping at the store reaches min_spend is given that level automatically,
-- once, and keeps it (the total is lifetime, not per month). A level without a
-- target is only ever given by hand.
--
--   membership_plans.min_spend      the lifetime spend that earns the level
--                                   (NULL = hand-given only)
--   membership_plans.number_prefix  the start of the number an automatic
--                                   membership gets, e.g. "PAW-126" gives
--                                   PAW-126-001, PAW-126-002 ... The store can
--                                   still edit any number afterwards.
--   customer_memberships.source     'manual' (given by an admin) or 'auto'
--                                   (earned by spending). Only an 'auto'
--                                   membership is ever moved up to a higher
--                                   level automatically; a manual one is left alone.
--
-- Requires 20261107000000_add_customer_memberships.sql. Additive: nullable
-- columns and one with a default, so existing rows and running code are
-- untouched. Apply this BEFORE deploying the code that saves them.
ALTER TABLE "public"."membership_plans"
  ADD COLUMN IF NOT EXISTS "min_spend" numeric(12,2) CHECK ("min_spend" IS NULL OR "min_spend" > 0),
  ADD COLUMN IF NOT EXISTS "number_prefix" text;

ALTER TABLE "public"."customer_memberships"
  ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL CHECK ("source" IN ('manual', 'auto'));
