-- Links an order back to the coupon that discounted it. coupon_code is a
-- denormalized snapshot (kept even if the coupon row is later deleted, via
-- ON DELETE SET NULL on coupon_id) so an order's receipt/history always
-- shows what code was used. orders.discount_amount already exists
-- (schema.sql) and is reused as-is for the coupon's computed discount.

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "coupon_id" "uuid",
  ADD COLUMN IF NOT EXISTS "coupon_code" character varying(50);

DO $$ BEGIN
  ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "orders_coupon_id_idx" ON "public"."orders" ("coupon_id");
