"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

// Atomically transfers stock from warehouse (product_inventory) to the
// vendor's pool (vendor_stock), and — if the order has an upfront/advance
// paid_amount — records it in vendor_payments, via the confirm_vendor_order
// RPC. See supabase/migrations/20260711000000_add_vendor_distribution_module.sql
// and 20260719000008_track_vendor_order_upfront_payment.sql.
// Blocks (throws) if any line item exceeds current warehouse stock.
export async function confirmVendorOrder(
  vendorOrderId: string,
  createdBy?: string | null,
): Promise<void> {
  // vendorOrderId is caller-supplied — confirm it belongs to the caller's
  // own store before letting the RPC move any stock. p_caller_store_id is
  // also passed through so the RPC itself re-checks (see
  // supabase/migrations/20260822000000_add_vendor_rpc_ownership_checks.sql).
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { error } = await supabaseAdmin.rpc("confirm_vendor_order", {
    p_vendor_order_id: vendorOrderId,
    p_created_by: createdBy || null,
    p_caller_store_id: storeResult.storeId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
