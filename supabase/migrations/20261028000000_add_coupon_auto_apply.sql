ALTER TABLE "public"."coupons"
  ADD COLUMN IF NOT EXISTS "auto_apply" boolean DEFAULT false NOT NULL;
