-- Month close: a saved copy of the Profit & Loss and the Balance Sheet.
--
-- The balance sheet is live (stock, dues and bills as they are right now), and the
-- database keeps no history of those figures. To look at the business as it stood at
-- the end of a past month, the owner closes the month: the figures are saved here and
-- never change afterwards. A month can be reopened (the saved copy deleted) and closed
-- again.
--
-- One saved copy per store, branch scope (a branch, or NULL for the whole store) and
-- month. `snapshot` holds the whole statement: profit and loss for the month, the
-- balance, vendor figures and cash.
--
-- Additive: one new table, nothing existing changes. Reads and writes go through
-- server actions (supabaseAdmin) that check the permission; there is no direct
-- access from the browser (RLS on, no policy).

CREATE TABLE IF NOT EXISTS "public"."period_closes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE CASCADE,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "snapshot" jsonb NOT NULL,
    "closed_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "closed_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "period_closes_dates_check" CHECK ("period_end" >= "period_start")
);
ALTER TABLE "public"."period_closes" OWNER TO "postgres";

-- One closed copy per store, branch scope and month end.
CREATE UNIQUE INDEX IF NOT EXISTS "period_closes_uidx"
  ON "public"."period_closes" ("store_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid), "period_end");

GRANT ALL ON TABLE "public"."period_closes" TO "service_role";
ALTER TABLE "public"."period_closes" ENABLE ROW LEVEL SECURITY;
