-- Replaces the Upstash Redis-backed "Generate Order Link" token store with a
-- plain Postgres table — one less external paid service to depend on, now
-- that everything else already runs self-hosted on the VPS. Redis gave
-- automatic TTL expiry for free; Postgres has no equivalent, so expiry is
-- enforced by checking expires_at at read time (see get-confirm-order's
-- route), and the table self-cleans by deleting its own expired rows every
-- time a new token is generated (generate-order-token's route) — no cron
-- job needed for either.
CREATE TABLE IF NOT EXISTS "public"."order_link_tokens" (
    "token" text NOT NULL,
    "store_id" uuid NOT NULL,
    "store_slug" text NOT NULL,
    "products" jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_link_tokens"
    ADD CONSTRAINT "order_link_tokens_pkey" PRIMARY KEY ("token");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."order_link_tokens"
    ADD CONSTRAINT "order_link_tokens_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "order_link_tokens_expires_at_idx" ON "public"."order_link_tokens" ("expires_at");

GRANT ALL ON TABLE "public"."order_link_tokens" TO "service_role";

-- No policy for anon/authenticated at all, on purpose: both routes that
-- touch this table (generate-order-token, get-confirm-order) run entirely
-- server-side via supabaseAdmin (service role, bypasses RLS) — a customer's
-- browser never queries this table directly, only through those two
-- controlled endpoints, so there's nothing for a client-side policy to
-- permit.
ALTER TABLE "public"."order_link_tokens" ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE "public"."order_link_tokens" IS
  'Short-lived tokens for the "Generate Order Link" feature — a prebuilt cart an admin shares with a customer, who visits /{store}/confirm-order?t=<token> to complete it. Replaces the old Redis-backed store; expires_at is checked at read time, and expired rows are swept on each new insert.';
