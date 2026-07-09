-- Stock movements: append-only audit trail for every inventory change (manual
-- adjustment, recount, or bulk update), plus atomic RPCs so concurrent writes
-- can never silently clobber each other the way a plain client-side
-- read-current -> compute-new -> overwrite UPDATE can.

CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "delta" integer NOT NULL,
    "previous_quantity" integer NOT NULL,
    "new_quantity" integer NOT NULL,
    "reason" character varying(50) DEFAULT 'manual_adjustment' NOT NULL,
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id")
);
ALTER TABLE "public"."stock_movements" OWNER TO "postgres";
ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "stock_movements_product_id_idx" ON "public"."stock_movements" ("product_id");
CREATE INDEX IF NOT EXISTS "stock_movements_variant_id_idx" ON "public"."stock_movements" ("variant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "public"."stock_movements" ("created_at" DESC);

GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";
-- No anon/authenticated policies — all access goes through supabaseAdmin, same pattern as courier_tracking.

-- ── Atomic relative adjustment ──────────────────────────────────────────────
-- Applies quantity_available = quantity_available + p_delta under a row lock
-- (SELECT ... FOR UPDATE), so two concurrent adjustments — or an admin edit
-- racing an order-driven change — always sum correctly instead of one
-- overwrite silently discarding the other. Every call is logged.
CREATE OR REPLACE FUNCTION "public"."adjust_inventory"(
    "p_product_id" "uuid",
    "p_variant_id" "uuid",
    "p_delta" integer,
    "p_reason" character varying DEFAULT 'manual_adjustment',
    "p_note" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL
) RETURNS TABLE("previous_quantity" integer, "new_quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  SELECT quantity_available INTO v_prev
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product % / variant %', p_product_id, p_variant_id;
  END IF;

  v_new := v_prev + p_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: have %, requested change %', v_prev, p_delta;
  END IF;

  UPDATE public.product_inventory
  SET quantity_available = v_new, updated_at = now()
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  INSERT INTO public.stock_movements
    (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_delta, v_prev, v_new, COALESCE(p_reason, 'manual_adjustment'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, v_new;
END;
$$;
ALTER FUNCTION "public"."adjust_inventory"("uuid", "uuid", integer, character varying, "text", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."adjust_inventory"("uuid", "uuid", integer, character varying, "text", "uuid") TO "service_role";

-- ── Atomic absolute set ─────────────────────────────────────────────────────
-- For deliberate full recounts/stocktakes where the target number is known
-- and should win outright. Still row-locked and logged — the difference vs.
-- adjust_inventory is purely in what's authoritative (the target vs. a delta).
CREATE OR REPLACE FUNCTION "public"."set_inventory"(
    "p_product_id" "uuid",
    "p_variant_id" "uuid",
    "p_quantity" integer,
    "p_reason" character varying DEFAULT 'recount',
    "p_note" "text" DEFAULT NULL,
    "p_created_by" "uuid" DEFAULT NULL
) RETURNS TABLE("previous_quantity" integer, "new_quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prev integer;
BEGIN
  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  SELECT quantity_available INTO v_prev
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product % / variant %', p_product_id, p_variant_id;
  END IF;

  UPDATE public.product_inventory
  SET quantity_available = p_quantity, updated_at = now()
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  INSERT INTO public.stock_movements
    (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_quantity - v_prev, v_prev, p_quantity, COALESCE(p_reason, 'recount'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, p_quantity;
END;
$$;
ALTER FUNCTION "public"."set_inventory"("uuid", "uuid", integer, character varying, "text", "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."set_inventory"("uuid", "uuid", integer, character varying, "text", "uuid") TO "service_role";
