-- A balance for any date from now on: the balance sheet saved day by day.
--
-- The database keeps no history of stock, customer dues, courier cash or supplier bills, so a balance
-- for a past date cannot be worked out afterwards. This keeps a copy of the balance (the figures the
-- Balance Sheet shows) for each day the owner uses the app, so any of those days can be looked up
-- later. A day with no copy has no balance: the page then points to the nearest days that have one.
--
-- One row per store, branch scope (a branch, or NULL for the whole store) and day; a later copy on the
-- same day replaces the earlier one, so the day's copy is the last one taken. Unlike a closed month
-- (period_closes) these are not locked and not tied to entries.
--
-- Additive: one new table. Reads and writes go through server actions (supabaseAdmin) that check
-- the permission; there is no direct access from the browser (RLS on, no policy).
CREATE TABLE IF NOT EXISTS "public"."balance_snapshots" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "snapshot_date" date NOT NULL,
    "snapshot" jsonb NOT NULL,
    "saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."balance_snapshots" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "balance_snapshots_uidx"
  ON "public"."balance_snapshots" ("store_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid), "snapshot_date");

GRANT ALL ON TABLE "public"."balance_snapshots" TO "service_role";
ALTER TABLE "public"."balance_snapshots" ENABLE ROW LEVEL SECURITY;
