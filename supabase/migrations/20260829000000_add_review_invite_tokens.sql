-- Magic review links: a vendor can generate a link for a specific
-- (order, product) pair so a customer who ordered via Messenger/WhatsApp —
-- and so has no storefront account at all — can create one and have that
-- order linked to it, unlocking a star rating for that product. Same shape
-- as password_reset_tokens: only a SHA-256 hash of the token is stored,
-- service_role-only (no anon/authenticated grant), looked up from server
-- actions with the service-role key.
--
-- No "used" state here — a link's job is to get orders.customer_id set for
-- the visitor's account; once that's done, ownership of the order itself
-- (not this table) is what future visits are checked against.

CREATE TABLE IF NOT EXISTS "public"."review_invite_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."review_invite_tokens" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "review_invite_tokens_token_hash_idx"
  ON "public"."review_invite_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "review_invite_tokens_order_product_idx"
  ON "public"."review_invite_tokens" ("order_id", "product_id");

DO $$ BEGIN
  ALTER TABLE ONLY "public"."review_invite_tokens"
    ADD CONSTRAINT "review_invite_tokens_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."review_invite_tokens"
    ADD CONSTRAINT "review_invite_tokens_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "public"."review_invite_tokens" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."review_invite_tokens" TO "service_role";
