"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

// Cancels a confirmed vendor order by reversing all stock:
// vendor_stock → product_inventory for every line item.
// Only confirmed orders can be cancelled — draft orders should be deleted instead.
export async function cancelVendorOrder(
  vendorOrderId: string,
  cancelledBy?: string | null,
): Promise<void> {
  // vendorOrderId is caller-supplied — confirm it belongs to the caller's
  // own store before letting the RPC move any stock. p_caller_store_id is
  // also passed through so the RPC itself re-checks (see
  // supabase/migrations/20260822000000_add_vendor_rpc_ownership_checks.sql).
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { error } = await supabaseAdmin.rpc("cancel_vendor_order", {
    p_vendor_order_id: vendorOrderId,
    p_cancelled_by: cancelledBy || null,
    p_caller_store_id: storeResult.storeId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
