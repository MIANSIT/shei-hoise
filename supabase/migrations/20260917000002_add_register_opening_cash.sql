-- "Day Start" cash — the float an admin puts in the drawer before the first
-- sale of the day. Register Audit's "Expected cash" was previously only the
-- day's own cash-method collections, silently assuming the drawer started
-- at zero; a real drawer usually starts with a float carried over (or
-- topped up) from the previous day, so Expected cash without it always ran
-- short of what's physically in the drawer. One row per store per day —
-- editable in place if the admin corrects it later that same day.

CREATE TABLE IF NOT EXISTS "public"."store_register_openings" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    "register_date" date NOT NULL,
    "opening_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."store_register_openings" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_register_openings"
    ADD CONSTRAINT "store_register_openings_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_register_openings"
    ADD CONSTRAINT "store_register_openings_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_register_openings"
    ADD CONSTRAINT "store_register_openings_store_date_unique"
    UNIQUE ("store_id", "register_date");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- No RLS here — same convention as orders/store_cod_settlements: never
-- reached from the anonymous storefront, isolation is the app's own
-- store_id filtering on every query.
GRANT ALL ON TABLE "public"."store_register_openings" TO "anon";
GRANT ALL ON TABLE "public"."store_register_openings" TO "authenticated";
GRANT ALL ON TABLE "public"."store_register_openings" TO "service_role";

COMMENT ON TABLE "public"."store_register_openings" IS
  'The cash float an admin starts the day with, one row per store per calendar date. Register Audit adds this to the day''s own cash collections (and any COD settled) to get the drawer''s true expected cash.';
