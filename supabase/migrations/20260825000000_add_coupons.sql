-- Coupon codes: store-scoped discount codes applied at checkout.
--
-- Carries financial logic the same way the vendor module does, so it gets
-- the same treatment: RLS enabled with a SELECT-only owner policy (shape
-- copied from 20260712000000_add_vendor_tables_rls.sql), and every write
-- goes through supabaseAdmin (service_role, bypasses RLS) inside "use
-- server" query functions. The rest of the app (products, orders, ...) has
-- no RLS at all and relies on application-level store_id filtering.
--
-- current_uses is a cap that must not be exceeded by two concurrent
-- checkouts redeeming the last use of the same coupon, so it's mutated only
-- through redeem_coupon() below, which locks the coupon row with
-- SELECT ... FOR UPDATE before re-checking and incrementing — mirroring how
-- confirm_vendor_order() in 20260822000000_add_vendor_rpc_ownership_checks.sql
-- locks rows before mutating counters that carry the same kind of invariant.

CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "code" character varying(50) NOT NULL,
    "discount_type" character varying(20) NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_order_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "max_uses" integer,
    "current_uses" integer DEFAULT 0 NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id")
);
ALTER TABLE "public"."coupons" OWNER TO "postgres";
ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_discount_type_check"
    CHECK ((("discount_type")::"text" = ANY (ARRAY[('percentage'::character varying)::"text", ('fixed_amount'::character varying)::"text"])));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_discount_value_check" CHECK ("discount_value" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_store_id_code_key" UNIQUE ("store_id", "code");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "coupons_store_id_idx" ON "public"."coupons" ("store_id");

CREATE TABLE IF NOT EXISTS "public"."coupon_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id")
);
ALTER TABLE "public"."coupon_redemptions" OWNER TO "postgres";
ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_order_id_key" UNIQUE ("order_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "coupon_redemptions_coupon_id_idx" ON "public"."coupon_redemptions" ("coupon_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_store_id_idx" ON "public"."coupon_redemptions" ("store_id");

DROP POLICY IF EXISTS "coupons_owner_select" ON "public"."coupons";
CREATE POLICY "coupons_owner_select" ON "public"."coupons" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

DROP POLICY IF EXISTS "coupon_redemptions_owner_select" ON "public"."coupon_redemptions";
CREATE POLICY "coupon_redemptions_owner_select" ON "public"."coupon_redemptions" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

GRANT ALL ON TABLE "public"."coupons" TO "service_role";
GRANT ALL ON TABLE "public"."coupon_redemptions" TO "service_role";
GRANT SELECT ON TABLE "public"."coupons" TO "authenticated";
GRANT SELECT ON TABLE "public"."coupon_redemptions" TO "authenticated";

-- ── redeem_coupon ────────────────────────────────────────────────────────
-- Called via supabaseAdmin.rpc() right after an order row has been inserted
-- in createCustomerOrder(). Locks the coupon row before re-checking active/
-- date-window/max_uses and incrementing current_uses, so two concurrent
-- checkouts redeeming the last use of a max_uses coupon can't both succeed
-- -- the earlier app-level validateCoupon() call is only a preview; this RPC
-- is the actual commit point for the usage cap.
DROP FUNCTION IF EXISTS "public"."redeem_coupon"("uuid", "uuid", numeric, "uuid");

CREATE OR REPLACE FUNCTION "public"."redeem_coupon"(
    "p_coupon_id" "uuid",
    "p_order_id" "uuid",
    "p_discount_amount" numeric,
    "p_store_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_coupon record;
BEGIN
  SELECT id, store_id, is_active, starts_at, ends_at, max_uses, current_uses INTO v_coupon
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

  INSERT INTO public.coupon_redemptions
    (coupon_id, order_id, store_id, discount_amount)
  VALUES
    (p_coupon_id, p_order_id, p_store_id, p_discount_amount);

  UPDATE public.coupons
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = p_coupon_id;
END;
$$;
ALTER FUNCTION "public"."redeem_coupon"("uuid", "uuid", numeric, "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."redeem_coupon"("uuid", "uuid", numeric, "uuid") TO "service_role";
