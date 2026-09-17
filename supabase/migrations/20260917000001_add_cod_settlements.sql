-- COD cash from a courier arrives as one lump-sum payout covering many
-- delivered orders at once, not per-order — a store can't reconcile "cash
-- in the drawer" against individual orders.total_amount the way a Quick
-- Sale transaction works. This records each payout as its own row (date,
-- courier, amount actually received, which orders it covers) and marks
-- every covered order via orders.cod_settlement_id so its cash is never
-- counted twice across settlements. Register Audit sums settlements by
-- settlement_date to add "COD cash settled" to that day's expected cash.

CREATE TABLE IF NOT EXISTS "public"."store_cod_settlements" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    "courier" character varying(20),
    "settlement_date" date NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "order_count" integer DEFAULT 0 NOT NULL,
    "note" text,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."store_cod_settlements" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_cod_settlements"
    ADD CONSTRAINT "store_cod_settlements_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_cod_settlements"
    ADD CONSTRAINT "store_cod_settlements_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "store_cod_settlements_store_date_idx"
  ON "public"."store_cod_settlements" ("store_id", "settlement_date");

-- No RLS here — same convention as orders/vendor_settlements: this table is
-- never reached from the anonymous storefront, and isolation is enforced by
-- the app's own store_id filtering on every query, not by a DB policy.
GRANT ALL ON TABLE "public"."store_cod_settlements" TO "anon";
GRANT ALL ON TABLE "public"."store_cod_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."store_cod_settlements" TO "service_role";

COMMENT ON TABLE "public"."store_cod_settlements" IS
  'One row per courier payout covering several delivered COD orders at once. orders.cod_settlement_id links each order to the settlement its cash arrived with, so Register Audit counts it exactly once, on the date it was actually received rather than the date the sale happened.';

ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "cod_settlement_id" uuid;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_cod_settlement_id_fkey"
    FOREIGN KEY ("cod_settlement_id") REFERENCES "public"."store_cod_settlements"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "orders_cod_settlement_id_idx" ON "public"."orders" ("cod_settlement_id");
