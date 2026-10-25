-- What the store owes each supplier. Two kinds of entry:
--   bill     goods bought on credit (adds to what is owed)
--   payment  money paid to the supplier (reduces it)
-- Due is never stored; it is always bills minus payments, the same "ledger,
-- not a balance field" approach as vendor and customer dues.
--
-- Requires 20261101000000_add_suppliers.sql. Writes go through supabaseAdmin
-- in permission-checked server actions (stock.supplier_money); the SELECT
-- policy lets only the store owner read rows directly — staff with the
-- permission read through the server actions.
CREATE TABLE IF NOT EXISTS "public"."supplier_ledger" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "store_id" uuid NOT NULL REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "supplier_id" uuid NOT NULL REFERENCES "public"."suppliers"("id") ON DELETE CASCADE,
    "kind" text NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "entry_date" date NOT NULL,
    "payment_method" text,
    "note" text,
    "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "supplier_ledger_kind_check" CHECK ("kind" IN ('bill', 'payment')),
    CONSTRAINT "supplier_ledger_amount_check" CHECK ("amount" > 0)
);
ALTER TABLE "public"."supplier_ledger" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "supplier_ledger_supplier_idx"
  ON "public"."supplier_ledger" ("supplier_id", "entry_date" DESC);
CREATE INDEX IF NOT EXISTS "supplier_ledger_store_idx"
  ON "public"."supplier_ledger" ("store_id");

GRANT ALL ON TABLE "public"."supplier_ledger" TO "service_role";
GRANT SELECT ON TABLE "public"."supplier_ledger" TO "authenticated";

ALTER TABLE "public"."supplier_ledger" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_ledger_owner_select" ON "public"."supplier_ledger";
CREATE POLICY "supplier_ledger_owner_select" ON "public"."supplier_ledger" FOR SELECT TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM "public"."users" u
    WHERE u."id" = auth.uid()
      AND u."store_id" = "supplier_ledger"."store_id"
      AND u."user_type" = 'store_owner'
  )
);
