-- Custom password-reset system, replacing GoTrue's own email-based reset.
-- Self-hosted GoTrue's SMTP isn't configured for real email delivery, so
-- reset links are now generated and emailed by the app itself (Gmail, same
-- as order notification emails) and verified against this table instead of
-- a Supabase recovery session. Safe to run multiple times.

-- ── 1. Reset token table ──────────────────────────────────────────────────
-- Deliberately service_role only — no anon/authenticated grant at all. The
-- app looks these up with the service-role key from a server-only route.
CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "redirect_type" character varying(10) NOT NULL,
    "store_slug" character varying(255),
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "password_reset_tokens_redirect_type_check" CHECK ((("redirect_type")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('user'::character varying)::"text"])))
);

ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_idx"
  ON "public"."password_reset_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx"
  ON "public"."password_reset_tokens" ("user_id");

DO $$ BEGIN
  ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";

-- ── 2. Look up a user id by email without paging through the admin API ────
CREATE OR REPLACE FUNCTION "public"."get_auth_user_id_by_email"("p_email" "text")
RETURNS "uuid"
LANGUAGE "sql"
SECURITY DEFINER
SET "search_path" TO 'public', 'auth'
AS $$
  SELECT "id" FROM "auth"."users" WHERE lower("email") = lower("p_email") LIMIT 1;
$$;

ALTER FUNCTION "public"."get_auth_user_id_by_email"("text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_auth_user_id_by_email"("text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."get_auth_user_id_by_email"("text") FROM "anon";
REVOKE ALL ON FUNCTION "public"."get_auth_user_id_by_email"("text") FROM "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_id_by_email"("text") TO "service_role";
