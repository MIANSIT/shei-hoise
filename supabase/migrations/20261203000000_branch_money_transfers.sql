-- Money sent from one branch to another, confirmed by the branch that receives it.
--
--   status  sent       the sending branch handed the money over. It has left the sender's balance and is
--                      in transit: still the business's money, but not yet in any branch.
--           received   the receiving branch confirmed it. It now counts in that branch's balance.
--           cancelled  the sender took it back before it was confirmed. Nothing moved.
--
-- Branch views count the money out of the sender on transfer_date and into the receiver on received_date.
-- The whole-store view never changes: the money stays in the business the whole time (in transit it is
-- added back, so it is not lost between the two branches).
--
-- Additive: one new table. Writes go through server actions (supabaseAdmin) that check the person may use
-- the sending branch (to send or cancel) or the receiving branch (to confirm). Anyone who can open Money
-- Overview (the reports permission) can read the rows, so branch balances add up for everyone.

CREATE TABLE IF NOT EXISTS "public"."branch_money_transfers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "from_branch_id" uuid NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE RESTRICT,
    "to_branch_id" uuid NOT NULL REFERENCES "public"."store_branches"("id") ON DELETE RESTRICT,
    "amount" numeric(14,2) NOT NULL,
    "payment_method" text NOT NULL,
    "transfer_date" date NOT NULL,
    "note" text,
    "status" text DEFAULT 'sent' NOT NULL,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "received_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "received_at" timestamp with time zone,
    "received_date" date,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "branch_money_transfers_branches_check" CHECK ("from_branch_id" <> "to_branch_id"),
    CONSTRAINT "branch_money_transfers_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "branch_money_transfers_method_check" CHECK ("payment_method" IN ('cash', 'mobile_banking', 'bank_transfer')),
    CONSTRAINT "branch_money_transfers_status_check" CHECK ("status" IN ('sent', 'received', 'cancelled')),
    CONSTRAINT "branch_money_transfers_received_check" CHECK (
      ("status" = 'received' AND "received_date" IS NOT NULL)
      OR ("status" <> 'received' AND "received_date" IS NULL)
    )
);
ALTER TABLE "public"."branch_money_transfers" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "branch_money_transfers_store_idx"
  ON "public"."branch_money_transfers" ("store_id", "transfer_date" DESC, "created_at" DESC);
CREATE INDEX IF NOT EXISTS "branch_money_transfers_to_idx"
  ON "public"."branch_money_transfers" ("to_branch_id", "status");

GRANT ALL ON TABLE "public"."branch_money_transfers" TO "service_role";
GRANT SELECT ON TABLE "public"."branch_money_transfers" TO "authenticated";
ALTER TABLE "public"."branch_money_transfers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_money_transfers_member_select" ON "public"."branch_money_transfers";
-- The owner, or staff who can see reports (Money Overview needs it). Customers carry users.store_id too, so the
-- store_id alone is not enough.
CREATE POLICY "branch_money_transfers_member_select" ON "public"."branch_money_transfers" FOR SELECT TO "authenticated"
  USING ("public"."has_store_permission"("store_id", 'reports.view'));
