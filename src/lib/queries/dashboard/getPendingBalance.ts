import { supabase } from "@/lib/supabase";

export interface PendingBalanceParts {
  /** What customers owe the shop directly (due sales), after their payments. */
  customerDue: number;
  /** Delivered online COD the couriers haven't handed over yet, at the full order total. */
  codPending: number;
  /** customerDue + codPending. */
  pending: number;
}

/**
 * Everything still unpaid right now, split into its two parts, for the whole
 * store or one branch, via the get_pending_balance RPC. A balance, not a period
 * figure. Null when the database doesn't have it yet, so callers keep the
 * figure they already have.
 * @returns the parts, or null if unavailable
 */
export async function getPendingBalanceParts(
  storeId: string,
  branchId?: string | null,
): Promise<PendingBalanceParts | null> {
  const { data, error } = await supabase.rpc("get_pending_balance", {
    p_store_id: storeId,
    ...(branchId ? { p_branch_id: branchId } : {}),
  });
  if (error || !data) {
    if (error) console.error("get_pending_balance failed:", error.message);
    return null;
  }
  const row = data as { customer_due?: number; cod_pending?: number; pending?: number };
  const pending = Number(row.pending);
  if (!Number.isFinite(pending)) return null;
  return {
    customerDue: Number(row.customer_due) || 0,
    codPending: Number(row.cod_pending) || 0,
    pending,
  };
}

/**
 * Everything still unpaid right now (customer due after payments + COD the
 * couriers haven't handed over), for the whole store or one branch.
 * @returns the pending amount, or null if unavailable
 */
export async function getPendingBalance(
  storeId: string,
  branchId?: string | null,
): Promise<number | null> {
  return (await getPendingBalanceParts(storeId, branchId))?.pending ?? null;
}
