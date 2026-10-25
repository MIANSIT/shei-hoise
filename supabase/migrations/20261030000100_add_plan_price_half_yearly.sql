-- 6-month price per plan. 0 means the plan doesn't offer 6-month billing
-- (same convention as price_yearly), so the option is hidden for it.
-- IF NOT EXISTS: the column was first added by hand in Studio.
ALTER TABLE "public"."subscription_plans"
  ADD COLUMN IF NOT EXISTS "price_half_yearly" numeric(12,2) DEFAULT 0 NOT NULL;
