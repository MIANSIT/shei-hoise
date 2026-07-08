-- Per-connection webhook secret (encrypted, same as client_secret/api_key) — each
-- store registers its own callback URL in its own Pathao merchant panel, so each
-- connected account needs its own secret rather than one shared across stores.
ALTER TABLE "public"."store_courier_credentials" ADD COLUMN IF NOT EXISTS "webhook_secret" "text";

-- Temporary capture table for raw Pathao webhook payloads. Pathao's docs only show
-- the verification handshake body — this lets us see the real shape of an actual
-- event (Delivered, Payment Invoice, etc.) once one is triggered, instead of
-- guessing field names before building the real parser.
CREATE TABLE IF NOT EXISTS "public"."pathao_webhook_debug_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credential_id" "uuid",
    "headers" "jsonb",
    "body" "jsonb",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id")
);
ALTER TABLE "public"."pathao_webhook_debug_log" OWNER TO "postgres";
ALTER TABLE "public"."pathao_webhook_debug_log" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."pathao_webhook_debug_log" TO "service_role";
-- No anon/authenticated policies — same pattern as courier_tracking; all access
-- goes through supabaseAdmin. Not FK-constrained to store_courier_credentials
-- since the incoming credential_id comes from an unauthenticated public URL and
-- shouldn't ever fail the insert just because it's malformed or stale.
