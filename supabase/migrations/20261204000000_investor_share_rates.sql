-- Changing a profit share percentage without rewriting the past.
--
-- A profit-share deal has the percent it started with (investor_deals.profit_share_pct). When the owner changes it,
-- a row here says "from this month, this percent". The share due for a month uses the latest row at or before that
-- month, or the starting percent when there is none. Months that already have a share paid cannot be changed, so
-- what was paid always matches the percent it was worked out with.
--
-- Additive: one new table. Writes go through owner-only server actions (supabaseAdmin); the SELECT policy lets only
-- the store owner read the rows. Requires 20261201000000_investor_money.sql.

CREATE TABLE IF NOT EXISTS "public"."investor_deal_rates" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "deal_id" uuid NOT NULL REFERENCES "public"."investor_deals"("id") ON DELETE CASCADE,
    "from_month" text NOT NULL,
    "profit_share_pct" numeric(5,2) NOT NULL,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "investor_deal_rates_month_check" CHECK ("from_month" ~ '^\d{4}-\d{2}$'),
    CONSTRAINT "investor_deal_rates_pct_check" CHECK ("profit_share_pct" > 0 AND "profit_share_pct" <= 100)
);
ALTER TABLE "public"."investor_deal_rates" OWNER TO "postgres";
CREATE UNIQUE INDEX IF NOT EXISTS "investor_deal_rates_uidx" ON "public"."investor_deal_rates" ("deal_id", "from_month");

GRANT ALL ON TABLE "public"."investor_deal_rates" TO "service_role";
GRANT SELECT ON TABLE "public"."investor_deal_rates" TO "authenticated";
ALTER TABLE "public"."investor_deal_rates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor_deal_rates_owner_select" ON "public"."investor_deal_rates";
CREATE POLICY "investor_deal_rates_owner_select" ON "public"."investor_deal_rates" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid() AND u."store_id" = "investor_deal_rates"."store_id" AND u."user_type" = 'store_owner'
  )
);
