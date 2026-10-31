-- Customer memberships, per store. A store creates membership levels (e.g.
-- Silver, Gold); each level has benefit rows (a wording, a discount percent and
-- the product categories it covers — no categories means every product). The
-- store then gives a customer a level by hand and types the membership number
-- itself (e.g. Paw-226-002), so the numbering follows whatever the store uses.
--
-- A membership is "expired" once ends_on has passed; nothing is stored for
-- that, it is worked out when read. Removing a membership deletes the row.
--
-- Additive: new tables only, existing rows and running code are untouched.
-- Apply this BEFORE deploying the code that reads memberships.
--
-- Writes go through supabaseAdmin in permission-checked server actions
-- (memberships.*); the SELECT policies let anyone in the store read.
CREATE TABLE IF NOT EXISTS "public"."membership_plans" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."membership_plans" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "membership_plans_store_name_uniq"
  ON "public"."membership_plans" ("store_id", lower("name"));

CREATE TABLE IF NOT EXISTS "public"."membership_plan_benefits" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "plan_id" uuid NOT NULL REFERENCES "public"."membership_plans"("id") ON DELETE CASCADE,
    "label" text NOT NULL,
    "discount_percent" numeric(5,2) NOT NULL,
    "category_ids" uuid[] DEFAULT '{}' NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "membership_plan_benefits_percent_check" CHECK ("discount_percent" > 0 AND "discount_percent" <= 100)
);
ALTER TABLE "public"."membership_plan_benefits" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "membership_plan_benefits_plan_idx"
  ON "public"."membership_plan_benefits" ("plan_id");

CREATE TABLE IF NOT EXISTS "public"."customer_memberships" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "customer_id" uuid NOT NULL REFERENCES "public"."store_customers"("id") ON DELETE CASCADE,
    "plan_id" uuid NOT NULL REFERENCES "public"."membership_plans"("id") ON DELETE RESTRICT,
    "membership_number" text NOT NULL,
    "starts_on" date NOT NULL,
    "ends_on" date,
    "notes" text,
    "assigned_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "customer_memberships_dates_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on")
);
ALTER TABLE "public"."customer_memberships" OWNER TO "postgres";

-- One membership per customer per store, and a number is used once per store
-- (compared ignoring case, so Paw-226-002 and PAW-226-002 are the same number).
CREATE UNIQUE INDEX IF NOT EXISTS "customer_memberships_customer_uniq"
  ON "public"."customer_memberships" ("store_id", "customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_memberships_number_uniq"
  ON "public"."customer_memberships" ("store_id", lower("membership_number"));
CREATE INDEX IF NOT EXISTS "customer_memberships_plan_idx"
  ON "public"."customer_memberships" ("plan_id");

GRANT ALL ON TABLE "public"."membership_plans" TO "service_role";
GRANT ALL ON TABLE "public"."membership_plan_benefits" TO "service_role";
GRANT ALL ON TABLE "public"."customer_memberships" TO "service_role";
GRANT SELECT ON TABLE "public"."membership_plans" TO "authenticated";
GRANT SELECT ON TABLE "public"."membership_plan_benefits" TO "authenticated";
GRANT SELECT ON TABLE "public"."customer_memberships" TO "authenticated";

ALTER TABLE "public"."membership_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_plan_benefits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customer_memberships" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_plans_store_select" ON "public"."membership_plans";
CREATE POLICY "membership_plans_store_select" ON "public"."membership_plans" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT u."store_id" FROM "public"."users" u WHERE u."id" = auth.uid())
);

DROP POLICY IF EXISTS "membership_plan_benefits_store_select" ON "public"."membership_plan_benefits";
CREATE POLICY "membership_plan_benefits_store_select" ON "public"."membership_plan_benefits" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT u."store_id" FROM "public"."users" u WHERE u."id" = auth.uid())
);

DROP POLICY IF EXISTS "customer_memberships_store_select" ON "public"."customer_memberships";
CREATE POLICY "customer_memberships_store_select" ON "public"."customer_memberships" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT u."store_id" FROM "public"."users" u WHERE u."id" = auth.uid())
);
