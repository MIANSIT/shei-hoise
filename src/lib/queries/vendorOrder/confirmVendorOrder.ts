"use server";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId } from "@/lib/permissions/server";
import { callVendorRpc } from "@/lib/queries/vendor/vendorBranchRpc";

// Atomically transfers stock from warehouse (product_inventory) to the
// vendor's pool (vendor_stock), and — if the order has an upfront/advance
// paid_amount — records it in vendor_payments, via the confirm_vendor_order
// RPC. See supabase/migrations/20260711000000_add_vendor_distribution_module.sql
// and 20260719000008_track_vendor_order_upfront_payment.sql.
// Blocks (throws) if any line item exceeds current warehouse stock.
// Stores with branches: the goods leave branchId (default branch when
// omitted), which must have every item.
export async function confirmVendorOrder(
  vendorOrderId: string,
  createdBy?: string | null,
  branchId?: string | null,
): Promise<void> {
  // vendorOrderId is caller-supplied — confirm it belongs to the caller's
  // own store before letting the RPC move any stock. p_caller_store_id is
  // also passed through so the RPC itself re-checks (see
  // supabase/migrations/20260822000000_add_vendor_rpc_ownership_checks.sql).
  const storeResult = await getAuthorizedStoreId("vendors.edit");
  if (!storeResult.ok) throw new Error(storeResult.error);
  if (branchId && !canUseBranch(storeResult.actor, branchId)) throw new Error(BRANCH_SCOPE_ERROR);

  const { error } = await callVendorRpc(
    "confirm_vendor_order",
    {
      p_vendor_order_id: vendorOrderId,
      p_created_by: createdBy || null,
      p_caller_store_id: storeResult.storeId,
    },
    { p_branch_id: branchId || null },
  );

  if (error) {
    throw new Error(error.message);
  }
}
