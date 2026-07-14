-- Row Level Security for the Vendor Distribution module.
--
-- The rest of this app (products, orders, product_inventory, expenses...)
-- has no RLS and relies entirely on application-level `.eq("store_id", ...)`
-- filtering, which is bypassable by anyone using the public anon key
-- directly against the Supabase REST API. Since vendor tables carry
-- financial data (dues, payments, receivables) and nothing yet depends on
-- them being unrestricted, they get locked down now while it's cheap.
--
-- Policy shape mirrors the one existing precedent in this schema --
-- "owner_read" on public.pixel_events -- which resolves the caller's store
-- via auth.uid() -> public.users.store_id and matches it against the row's
-- store_id. Tables that don't carry store_id directly (the *_items and
-- *_movements audit/line-item tables) join up to their parent row to reach
-- it instead.
--
-- Only SELECT policies are added. All writes to these tables already go
-- through supabaseAdmin (the service_role client) inside "use server"
-- functions and the confirm_vendor_order / record_vendor_settlement RPCs --
-- service_role bypasses RLS entirely, so those keep working unchanged.
-- With RLS enabled and no INSERT/UPDATE/DELETE policy for anon/authenticated,
-- direct writes from the browser's anon-key client are now denied by
-- default, which is the actual goal here.

ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_stock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_settlement_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_payments" ENABLE ROW LEVEL SECURITY;
-- vendor_stock_movements already had RLS enabled in the prior migration
-- (mirroring stock_movements), with no policies -- i.e. already fully
-- locked down for anon/authenticated. Add the read policy here too so the
-- audit trail is at least viewable by the owning store.
ALTER TABLE "public"."vendor_stock_movements" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_owner_select" ON "public"."vendors";
CREATE POLICY "vendors_owner_select" ON "public"."vendors" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

DROP POLICY IF EXISTS "vendor_stock_owner_select" ON "public"."vendor_stock";
CREATE POLICY "vendor_stock_owner_select" ON "public"."vendor_stock" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

DROP POLICY IF EXISTS "vendor_orders_owner_select" ON "public"."vendor_orders";
CREATE POLICY "vendor_orders_owner_select" ON "public"."vendor_orders" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

DROP POLICY IF EXISTS "vendor_settlements_owner_select" ON "public"."vendor_settlements";
CREATE POLICY "vendor_settlements_owner_select" ON "public"."vendor_settlements" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

DROP POLICY IF EXISTS "vendor_payments_owner_select" ON "public"."vendor_payments";
CREATE POLICY "vendor_payments_owner_select" ON "public"."vendor_payments" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
);

DROP POLICY IF EXISTS "vendor_order_items_owner_select" ON "public"."vendor_order_items";
CREATE POLICY "vendor_order_items_owner_select" ON "public"."vendor_order_items" FOR SELECT TO "authenticated" USING (
  "vendor_order_id" IN (
    SELECT "vendor_orders"."id" FROM "public"."vendor_orders"
    WHERE "vendor_orders"."store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
  )
);

DROP POLICY IF EXISTS "vendor_settlement_items_owner_select" ON "public"."vendor_settlement_items";
CREATE POLICY "vendor_settlement_items_owner_select" ON "public"."vendor_settlement_items" FOR SELECT TO "authenticated" USING (
  "settlement_id" IN (
    SELECT "vendor_settlements"."id" FROM "public"."vendor_settlements"
    WHERE "vendor_settlements"."store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
  )
);

DROP POLICY IF EXISTS "vendor_stock_movements_owner_select" ON "public"."vendor_stock_movements";
CREATE POLICY "vendor_stock_movements_owner_select" ON "public"."vendor_stock_movements" FOR SELECT TO "authenticated" USING (
  "vendor_id" IN (
    SELECT "vendors"."id" FROM "public"."vendors"
    WHERE "vendors"."store_id" IN (SELECT "users"."store_id" FROM "public"."users" WHERE "users"."id" = "auth"."uid"())
  )
);
