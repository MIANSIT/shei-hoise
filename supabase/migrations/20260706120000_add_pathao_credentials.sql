-- Pathao Courier integration — per-store merchant credentials.
-- Safe to run multiple times (IF NOT EXISTS guards throughout).

-- Holds OAuth secrets (client_secret, access_token, refresh_token) as
-- application-level ciphertext (see src/lib/utils/encryption.ts) — never
-- plaintext. Service-role only: RLS is enabled with no policies for
-- anon/authenticated, so those roles get zero access by default, matching
-- the customer_risk_profiles precedent. All reads/writes go through
-- "use server" actions using supabaseAdmin.
CREATE TABLE IF NOT EXISTS "public"."store_pathao_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "pathao_store_id" integer,
    "pathao_store_name" character varying(255),
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    UNIQUE ("store_id")
);
ALTER TABLE "public"."store_pathao_credentials" OWNER TO "postgres";
ALTER TABLE "public"."store_pathao_credentials" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_pathao_credentials"
    ADD CONSTRAINT "store_pathao_credentials_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE "public"."store_pathao_credentials" TO "service_role";
