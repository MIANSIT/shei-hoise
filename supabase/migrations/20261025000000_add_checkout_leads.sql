-- Abandoned checkouts: shoppers who typed a phone number at checkout.
--
-- One row per (store, phone), updated as the shopper fills in more of the form
-- and as the cart changes. Once they place an order the row is stamped
-- converted_at and stops showing up. The dashboard lists the rest so the owner
-- can call or WhatsApp them.
--
-- Contains customer phone numbers and names, so access is service-role only:
-- nothing reads or writes it with the anon or authenticated key. Every read and
-- write goes through server code that checks the store (see
-- src/app/api/checkout-lead and src/lib/queries/checkoutLeads).

CREATE TABLE IF NOT EXISTS "public"."checkout_leads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    -- Local Bangladeshi format, 11 digits starting 01
    "phone" character varying(20) NOT NULL,
    "customer_name" character varying(255),
    "city" character varying(255),
    "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "num_items" integer DEFAULT 0 NOT NULL,
    "cart_value" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" character varying(10),
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."checkout_leads" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."checkout_leads"
    ADD CONSTRAINT "checkout_leads_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."checkout_leads"
    ADD CONSTRAINT "checkout_leads_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- One live row per shopper per store; the capture route upserts on this.
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_leads_store_phone_key"
  ON "public"."checkout_leads" ("store_id", "phone");

-- The dashboard list: open leads for a store, newest first.
CREATE INDEX IF NOT EXISTS "checkout_leads_store_open_idx"
  ON "public"."checkout_leads" ("store_id", "updated_at" DESC)
  WHERE "converted_at" IS NULL;

GRANT ALL ON TABLE "public"."checkout_leads" TO "service_role";

ALTER TABLE "public"."checkout_leads" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "checkout_leads_service_only" ON "public"."checkout_leads" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."checkout_leads" IS
  'Shoppers who entered a phone number at checkout, for the abandoned-checkouts list. Holds customer phone numbers: service-role access only.';
