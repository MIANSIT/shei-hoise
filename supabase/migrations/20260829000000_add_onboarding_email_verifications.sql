-- Email verification codes for the onboarding signup flow. The store owner
-- doesn't have an account yet at the point they're verifying their email
-- (onboarding creates the Supabase Auth user + rows only after verification
-- succeeds), so this can't hang off auth.users like password_reset_tokens
-- does — it's keyed by the raw email address instead.
-- Deliberately service_role only, same posture as password_reset_tokens.

CREATE TABLE IF NOT EXISTS "public"."onboarding_email_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "email" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."onboarding_email_verifications" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "onboarding_email_verifications_email_idx"
  ON "public"."onboarding_email_verifications" (lower("email"));

ALTER TABLE "public"."onboarding_email_verifications" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."onboarding_email_verifications" TO "service_role";
