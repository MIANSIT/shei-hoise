-- Money given back to a customer, e.g. when a paid order is returned. Without
-- it a returned order simply vanished from Money Overview for the day it was
-- paid, and the refund never reduced the cash or bKash balance it came from.
--
-- One row = one refund:
--   refund_amount / payment_method / refund_date  what left, from which method, when
--   received_amount / received_date               set only when the refund was created by
--                                                 returning a paid order: the money that order
--                                                 had brought in, and the day it was counted.
--                                                 Returned orders are left out of "received",
--                                                 so this puts that money back on its original
--                                                 day instead of rewriting history.
-- Amounts are the product part only (items − discount + extra charges),
-- like Sales; delivery and tax are not the shop's money.
--
-- Writes go through supabaseAdmin in permission-checked server actions; the
-- SELECT policy lets anyone who can see orders or the register read them.
-- Additive: nothing existing changes.
CREATE TABLE IF NOT EXISTS "public"."customer_refunds" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "public"."store_branches"("id") ON DELETE SET NULL,
    "order_id" uuid REFERENCES "public"."orders"("id") ON DELETE SET NULL,
    "refund_amount" numeric(12,2) NOT NULL,
    "payment_method" text DEFAULT 'cash' NOT NULL,
    "refund_date" date NOT NULL,
    "received_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "received_date" date,
    "notes" text,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "customer_refunds_amount_check" CHECK ("refund_amount" > 0),
    CONSTRAINT "customer_refunds_received_check" CHECK ("received_amount" >= 0)
);
ALTER TABLE "public"."customer_refunds" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "customer_refunds_store_date_idx"
  ON "public"."customer_refunds" ("store_id", "refund_date" DESC);
CREATE INDEX IF NOT EXISTS "customer_refunds_store_received_idx"
  ON "public"."customer_refunds" ("store_id", "received_date");
CREATE INDEX IF NOT EXISTS "customer_refunds_order_idx"
  ON "public"."customer_refunds" ("order_id");

GRANT ALL ON TABLE "public"."customer_refunds" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_refunds" TO "authenticated";

ALTER TABLE "public"."customer_refunds" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_refunds_select" ON "public"."customer_refunds";
CREATE POLICY "customer_refunds_select" ON "public"."customer_refunds" FOR SELECT TO "authenticated" USING (
  "public"."has_store_permission"("store_id", 'orders.view')
  OR "public"."has_store_permission"("store_id", 'register.view')
);
