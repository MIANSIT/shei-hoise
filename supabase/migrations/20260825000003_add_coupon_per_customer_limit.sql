-- Adds a per-customer redemption cap alongside the existing global max_uses
-- cap, so a "first order" style coupon can actually be limited to one use
-- per customer, not just capped globally across all customers combined.
--
-- coupon_redemptions.customer_id lets redeem_coupon() count a specific
-- customer's past redemptions of a coupon. It's nullable because an order
-- can in principle have no resolved store_customers row, mirroring
-- orders.customer_id's own nullability/ON DELETE SET NULL shape.

ALTER TABLE "public"."coupons"
  ADD COLUMN IF NOT EXISTS "max_uses_per_customer" integer;

ALTER TABLE "public"."coupon_redemptions"
  ADD COLUMN IF NOT EXISTS "customer_id" uuid;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "coupon_redemptions_customer_id_idx" ON "public"."coupon_redemptions" ("customer_id");

-- redeem_coupon gains a p_customer_id parameter and, inside the same
-- FOR UPDATE-locked coupon row from the original migration, re-checks the
-- per-customer cap before inserting the redemption. Locking the coupon row
-- (not a per-customer row) is what keeps this race-safe: every concurrent
-- redemption attempt for this coupon, from any customer, serializes through
-- that one lock, so two simultaneous submissions from the same customer
-- can't both slip past the "have they already used this" count.
DROP FUNCTION IF EXISTS "public"."redeem_coupon"("uuid", "uuid", numeric, "uuid");

CREATE OR REPLACE FUNCTION "public"."redeem_coupon"(
    "p_coupon_id" "uuid",
    "p_order_id" "uuid",
    "p_discount_amount" numeric,
    "p_store_id" "uuid",
    "p_customer_id" "uuid" DEFAULT NULL
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_coupon record;
  v_customer_uses integer;
BEGIN
  SELECT id, store_id, is_active, starts_at, ends_at, max_uses, current_uses, max_uses_per_customer INTO v_coupon
  FROM public.coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon % not found', p_coupon_id;
  END IF;

  IF v_coupon.store_id IS DISTINCT FROM p_store_id THEN
    RAISE EXCEPTION 'Coupon % does not belong to store %', p_coupon_id, p_store_id;
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'Coupon % is no longer active', p_coupon_id;
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN
    RAISE EXCEPTION 'Coupon % is not yet active', p_coupon_id;
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at THEN
    RAISE EXCEPTION 'Coupon % has expired', p_coupon_id;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'Coupon % has reached its usage limit', p_coupon_id;
  END IF;

  IF v_coupon.max_uses_per_customer IS NOT NULL AND p_customer_id IS NOT NULL THEN
    SELECT count(*) INTO v_customer_uses
    FROM public.coupon_redemptions
    WHERE coupon_id = p_coupon_id AND customer_id = p_customer_id;

    IF v_customer_uses >= v_coupon.max_uses_per_customer THEN
      RAISE EXCEPTION 'Coupon % has already been used the maximum number of times by this customer', p_coupon_id;
    END IF;
  END IF;

  INSERT INTO public.coupon_redemptions
    (coupon_id, order_id, store_id, customer_id, discount_amount)
  VALUES
    (p_coupon_id, p_order_id, p_store_id, p_customer_id, p_discount_amount);

  UPDATE public.coupons
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = p_coupon_id;
END;
$$;
ALTER FUNCTION "public"."redeem_coupon"("uuid", "uuid", numeric, "uuid", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."redeem_coupon"("uuid", "uuid", numeric, "uuid", "uuid") TO "service_role";
