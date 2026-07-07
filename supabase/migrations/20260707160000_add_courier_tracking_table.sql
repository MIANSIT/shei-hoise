CREATE TABLE IF NOT EXISTS "public"."courier_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "courier" character varying(20) NOT NULL,
    "courier_credential_id" "uuid",
    "consignment_id" "text" NOT NULL,
    "status" character varying(100),
    "shipment_details" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id")
);
ALTER TABLE "public"."courier_tracking" OWNER TO "postgres";
ALTER TABLE "public"."courier_tracking" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."courier_tracking"
    ADD CONSTRAINT "courier_tracking_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."courier_tracking"
    ADD CONSTRAINT "courier_tracking_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."courier_tracking"
    ADD CONSTRAINT "courier_tracking_credential_id_fkey" FOREIGN KEY ("courier_credential_id") REFERENCES "public"."store_courier_credentials"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Postgres enforces "at most one active shipment per order" instead of application code.
CREATE UNIQUE INDEX IF NOT EXISTS "courier_tracking_one_active_per_order" ON "public"."courier_tracking" ("order_id") WHERE ("is_active");
CREATE INDEX IF NOT EXISTS "courier_tracking_order_id_idx" ON "public"."courier_tracking" ("order_id");
CREATE INDEX IF NOT EXISTS "courier_tracking_store_courier_idx" ON "public"."courier_tracking" ("store_id", "courier");

GRANT ALL ON TABLE "public"."courier_tracking" TO "service_role";
-- No anon/authenticated policies — same pattern as store_courier_credentials; all access goes through supabaseAdmin.

-- Backfill: every order currently carrying an active shipment becomes one row.
INSERT INTO "public"."courier_tracking" ("order_id", "store_id", "courier", "courier_credential_id", "consignment_id", "status", "shipment_details", "is_active", "created_at", "updated_at")
SELECT "id", "store_id", "courier", "courier_credential_id", "courier_consignment_id", "courier_order_status", "courier_shipment_details", true, "created_at", "updated_at"
FROM "public"."orders"
WHERE "courier_consignment_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill: every entry already archived in courier_shipment_history (from the prior
-- migration's approach) becomes an inactive row — only runs if that column actually
-- exists (its own migration may never have been applied, in which case there's
-- nothing to migrate). PL/pgSQL only prepares this statement if the IF is true, so
-- it's safe to reference the column here even when it doesn't exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'courier_shipment_history'
  ) THEN
    INSERT INTO "public"."courier_tracking" ("order_id", "store_id", "courier", "courier_credential_id", "consignment_id", "status", "shipment_details", "is_active", "created_at", "updated_at")
    SELECT "o"."id", "o"."store_id",
           ("h"->>'courier')::character varying,
           NULLIF("h"->>'credentialId', '')::uuid,
           "h"->>'consignmentId',
           "h"->>'orderStatus',
           "h"->'shipmentDetails',
           false,
           COALESCE(("h"->>'archivedAt')::timestamp with time zone, now()),
           COALESCE(("h"->>'archivedAt')::timestamp with time zone, now())
    FROM "public"."orders" "o", LATERAL jsonb_array_elements(COALESCE("o"."courier_shipment_history", '[]'::jsonb)) "h"
    WHERE "o"."courier_shipment_history" IS NOT NULL AND jsonb_array_length("o"."courier_shipment_history") > 0;
  END IF;
END $$;

-- Now that everything is preserved as real rows, drop the columns being replaced.
ALTER TABLE "public"."orders"
  DROP COLUMN IF EXISTS "courier_consignment_id",
  DROP COLUMN IF EXISTS "courier_order_status",
  DROP COLUMN IF EXISTS "courier_credential_id",
  DROP COLUMN IF EXISTS "courier_shipment_details",
  DROP COLUMN IF EXISTS "courier_shipment_history";
