-- Onboarding was shortened to 2 steps; store_settings now gets generic
-- defaults (BDT, 0% tax, one free shipping method) instead of the merchant's
-- real numbers. This flag drives a dismissible "finish setting up your
-- store" prompt in the dashboard — NULL means the prompt should still show.
ALTER TABLE "public"."stores"
  ADD COLUMN IF NOT EXISTS "setup_completed_at" timestamp with time zone;

-- Backfill existing stores so the prompt only appears for stores created
-- through the new short onboarding, not retroactively for merchants who
-- already configured everything under the old 5-step flow.
UPDATE "public"."stores"
  SET "setup_completed_at" = "created_at"
  WHERE "setup_completed_at" IS NULL;
