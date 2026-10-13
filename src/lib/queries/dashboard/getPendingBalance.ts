import { supabase } from "@/lib/supabase";

/**
 * Everything still unpaid right now (customer due after payments + COD the
 * couriers haven't handed over), for the whole store or one branch, via the
 * get_pending_balance RPC. A balance, not a period figure. Null when the
 * database doesn't have it yet, so callers keep the figure they already have.
 * @returns the pending amount, or null if unavailable
 */
export async function getPendingBalance(
  storeId: string,
  branchId?: string | null,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_pending_balance", {
    p_store_id: storeId,
    ...(branchId ? { p_branch_id: branchId } : {}),
  });
  if (error || !data) {
    if (error) console.error("get_pending_balance failed:", error.message);
    return null;
  }
  const pending = Number((data as { pending?: number }).pending);
  return Number.isFinite(pending) ? pending : null;
}
