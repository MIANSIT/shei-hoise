-- Remember when a customer was last sent a payment reminder from the Customer
-- Dues page, so the same customer isn't nagged twice in a day without noticing.
--
-- A separate table (not a column on store_customers): one customer row can be
-- linked to several stores, and a store with branches reminds per branch.
-- One row per reminder sent; the list shows the latest. Read and written only
-- by server actions (service role) — no policies, so no direct client access.

CREATE TABLE IF NOT EXISTS "public"."customer_due_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "amount" numeric(12,2),
    "channel" "text" DEFAULT 'whatsapp' NOT NULL,
    "reminded_by" "uuid",
    "reminded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_due_reminders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_due_reminders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    CONSTRAINT "customer_due_reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE CASCADE,
    CONSTRAINT "customer_due_reminders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."store_branches"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "customer_due_reminders_lookup_idx"
  ON "public"."customer_due_reminders" ("store_id", "customer_id", "reminded_at" DESC);

ALTER TABLE "public"."customer_due_reminders" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."customer_due_reminders" TO "service_role";
