-- Facebook Commerce Suite (CAPI + risk scoring) + trial/subscription defaults
-- Review before applying to a live database. Safe to run multiple times
-- (IF NOT EXISTS / IF EXISTS guards throughout).

-- ── 1. Conversions API credentials on store_settings ─────────────────────────
ALTER TABLE "public"."store_settings"
  ADD COLUMN IF NOT EXISTS "facebook_capi_access_token" "text",
  ADD COLUMN IF NOT EXISTS "facebook_test_event_code" character varying;

-- ── 2. CAPI delivery tracking on pixel_events ─────────────────────────────────
ALTER TABLE "public"."pixel_events"
  ADD COLUMN IF NOT EXISTS "capi_delivered" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "capi_error" "text";

-- ── 3. Close the open pixel_events insert policy ──────────────────────────────
-- All inserts now go exclusively through the service-role API route
-- (/api/pixel-event); no anon/authenticated client should insert directly.
DROP POLICY IF EXISTS "public_insert" ON "public"."pixel_events";

-- ── 4. Default trial plan flag ────────────────────────────────────────────────
-- Exactly one subscription_plans row may have this set — new stores are
-- auto-enrolled into whichever plan has is_default_trial_plan = true.
ALTER TABLE "public"."subscription_plans"
  ADD COLUMN IF NOT EXISTS "is_default_trial_plan" boolean DEFAULT false NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "one_default_trial_plan"
  ON "public"."subscription_plans" ("is_default_trial_plan")
  WHERE "is_default_trial_plan" = true;

-- ── 5. COD fake-order risk scoring ────────────────────────────────────────────
-- Deliberately NOT scoped by store_id — pooling signal across every store
-- on the platform is the point. service_role-only: RLS is enabled with no
-- policies for anon/authenticated, so those roles get zero access by default.
CREATE TABLE IF NOT EXISTS "public"."customer_risk_profiles" (
    "phone_number" "text" PRIMARY KEY,
    "total_orders" integer DEFAULT 0 NOT NULL,
    "delivered_orders" integer DEFAULT 0 NOT NULL,
    "cancelled_orders" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."customer_risk_profiles" OWNER TO "postgres";
ALTER TABLE "public"."customer_risk_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."customer_risk_store_touches" (
    "phone_number" "text" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("phone_number", "store_id")
);
ALTER TABLE "public"."customer_risk_store_touches" OWNER TO "postgres";
ALTER TABLE "public"."customer_risk_store_touches" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."customer_risk_store_touches"
    ADD CONSTRAINT "customer_risk_store_touches_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deliberately service_role only — no anon/authenticated grant at all.
GRANT ALL ON TABLE "public"."customer_risk_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."customer_risk_store_touches" TO "service_role";

-- ── 6. Purchase-event send status per order ───────────────────────────────────
-- Tracks whether the Facebook Purchase event for this order was sent
-- immediately, held pending delivery (high risk phone), or suppressed
-- (order was cancelled before ever being sent).
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "fb_purchase_event_status" character varying(20) DEFAULT 'sent';

DO $$ BEGIN
  ALTER TABLE "public"."orders"
    ADD CONSTRAINT "orders_fb_purchase_event_status_check"
    CHECK (("fb_purchase_event_status")::"text" = ANY (ARRAY[
      ('sent'::character varying)::"text",
      ('held'::character varying)::"text",
      ('suppressed'::character varying)::"text"
    ]));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
