import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface OwnerWithdrawal {
  id: string;
  amount: number;
  payment_method: string;
  withdrawal_date: string;
  notes: string | null;
  branch_id: string | null;
}

/**
 * Withdrawals dated in a range, newest first. Row security only lets the
 * store owner read them, so for anyone else this is simply empty.
 * @returns the withdrawals (one branch's when `branchId` is given)
 */
export async function getOwnerWithdrawals(
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId?: string | null,
): Promise<OwnerWithdrawal[]> {
  if (!storeId) return [];
  const rows = await fetchAllPaged<OwnerWithdrawal>((from, to) => {
    let query = supabase
      .from("owner_withdrawals")
      .select("id, amount, payment_method, withdrawal_date, notes, branch_id")
      .eq("store_id", storeId)
      .gte("withdrawal_date", fromDate)
      .lte("withdrawal_date", toDate);
    if (branchId) query = query.eq("branch_id", branchId);
    return query
      .order("withdrawal_date", { ascending: false })
      .order("id")
      .range(from, to) as unknown as PromiseLike<{
      data: OwnerWithdrawal[] | null;
      error: { message: string } | null;
    }>;
  });
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}
