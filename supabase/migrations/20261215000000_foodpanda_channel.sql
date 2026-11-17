-- foodpanda (Delivery Hero Partner API) as a sales channel.
--
-- foodpanda is a marketplace, not a courier: orders arrive from it and the
-- catalogue is pushed to it, so it does not belong in store_courier_credentials
-- alongside Pathao/Steadfast/Paperfly. It gets its own account table.
--
-- Additive and idempotent throughout; nothing here requires a backfill window
-- and existing code is unaffected until it starts selecting the new columns.

-- ---------------------------------------------------------------------------
-- Connected foodpanda vendor accounts, one row per vendor per environment.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."store_foodpanda_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "label" character varying(100) DEFAULT 'foodpanda'::character varying NOT NULL,
    "environment" character varying(10) DEFAULT 'sandbox'::character varying NOT NULL,

    -- Identifiers from the Partner Portal. Not secret, so stored in clear:
    -- they appear in every request path and are needed to build webhook URLs.
    "chain_id" "text" NOT NULL,
    "vendor_id" "text" NOT NULL,

    -- OAuth client credentials, encrypted at rest (src/lib/utils/encryption.ts),
    -- same treatment as every courier credential in this database.
    "client_id" "text",
    "client_secret" "text",

    -- Webhook authentication. foodpanda supports one mode at a time per chain:
    --   'static' — the configured token arrives in the Authorization header
    --   'hmac'   — X-DH-Signature carries HMAC-SHA256(raw body) as lowercase hex
    -- Separate secrets per webhook because the portal exposes two URL fields
    -- (Assortment and Order); they may hold the same value.
    "webhook_auth_type" character varying(16) DEFAULT 'static'::character varying NOT NULL,
    "order_webhook_secret" "text",
    "catalog_webhook_secret" "text",

    "is_active" boolean DEFAULT true NOT NULL,
    "connected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "store_foodpanda_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "store_foodpanda_accounts_environment_check"
      CHECK ((("environment")::"text" = ANY (ARRAY['sandbox'::"text", 'live'::"text"]))),
    CONSTRAINT "store_foodpanda_accounts_webhook_auth_type_check"
      CHECK ((("webhook_auth_type")::"text" = ANY (ARRAY['static'::"text", 'hmac'::"text"])))
);

DO $$ BEGIN
  ALTER TABLE "public"."store_foodpanda_accounts"
    ADD CONSTRAINT "store_foodpanda_accounts_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One connected account per vendor per environment, so a re-connect updates
-- rather than silently creating a second account that splits the order feed.
CREATE UNIQUE INDEX IF NOT EXISTS "store_foodpanda_accounts_unique_vendor"
  ON "public"."store_foodpanda_accounts" ("store_id", "chain_id", "vendor_id", "environment");

CREATE INDEX IF NOT EXISTS "store_foodpanda_accounts_store_id_idx"
  ON "public"."store_foodpanda_accounts" ("store_id");

-- ---------------------------------------------------------------------------
-- Catalog job tracking. Catalog add/update/export are asynchronous: the API
-- answers 202 with a job_id and the outcome arrives later by webhook (or by
-- polling, for add). Without a row here a merchant has no way to see whether
-- last night's sync finished.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."foodpanda_catalog_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "job_id" "text" NOT NULL,
    "job_type" character varying(16) NOT NULL,
    "status" character varying(20) DEFAULT 'QUEUED'::character varying NOT NULL,
    "product_count" integer DEFAULT 0 NOT NULL,
    "download_url" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "foodpanda_catalog_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "foodpanda_catalog_jobs_job_type_check"
      CHECK ((("job_type")::"text" = ANY (ARRAY['add'::"text", 'update'::"text", 'export'::"text"])))
);

DO $$ BEGIN
  ALTER TABLE "public"."foodpanda_catalog_jobs"
    ADD CONSTRAINT "foodpanda_catalog_jobs_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "public"."store_foodpanda_accounts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "foodpanda_catalog_jobs_job_id_idx"
  ON "public"."foodpanda_catalog_jobs" ("account_id", "job_id");

CREATE INDEX IF NOT EXISTS "foodpanda_catalog_jobs_store_id_idx"
  ON "public"."foodpanda_catalog_jobs" ("store_id", "created_at" DESC);

-- ---------------------------------------------------------------------------
-- Link a Shei Hoise order back to the foodpanda order it came from.
-- orders.channel is free text (today 'online' / 'pos'); 'foodpanda' joins it
-- with no constraint to alter.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "foodpanda_order_id" "text",
  ADD COLUMN IF NOT EXISTS "foodpanda_order_code" "text",
  ADD COLUMN IF NOT EXISTS "foodpanda_account_id" "uuid",
  ADD COLUMN IF NOT EXISTS "foodpanda_order_status" character varying(32),
  ADD COLUMN IF NOT EXISTS "foodpanda_payload" "jsonb";

-- The webhook may be delivered more than once (foodpanda retries up to 5
-- times and documents no de-duplication), so the same foodpanda order must
-- never become two Shei Hoise orders.
CREATE UNIQUE INDEX IF NOT EXISTS "orders_foodpanda_order_id_unique"
  ON "public"."orders" ("foodpanda_order_id")
  WHERE "foodpanda_order_id" IS NOT NULL;

-- Maps a Shei Hoise product to its foodpanda SKU, so catalog pushes and
-- incoming order lines resolve to the same product both ways.
ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "foodpanda_sku" "text";

CREATE INDEX IF NOT EXISTS "products_foodpanda_sku_idx"
  ON "public"."products" ("store_id", "foodpanda_sku")
  WHERE "foodpanda_sku" IS NOT NULL;
