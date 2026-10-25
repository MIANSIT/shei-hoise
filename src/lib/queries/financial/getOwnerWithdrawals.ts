import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface OwnerWithdrawal {
  id: string;
  amount: number;
  /** Where the money came out of (for a transfer: the method it moved from). */
  payment_method: string;
  withdrawal_date: string;
  notes: string | null;
  branch_id: string | null;
  /** "withdrawal" leaves the business; "transfer" moves money between methods. */
  kind: "withdrawal" | "transfer";
  /** Transfers only: the method the money moved to. */
  to_method: string | null;
}

interface Row {
  id: string;
  amount: number;
  payment_method: string;
  withdrawal_date: string;
  notes: string | null;
  branch_id: string | null;
  kind?: string | null;
  to_method?: string | null;
}

async function load(
  columns: string,
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId: string | null,
): Promise<Row[]> {
  return fetchAllPaged<Row>((from, to) => {
    let query = supabase
      .from("owner_withdrawals")
      .select(columns)
      .eq("store_id", storeId)
      .gte("withdrawal_date", fromDate)
      .lte("withdrawal_date", toDate);
    if (branchId) query = query.eq("branch_id", branchId);
    return query
      .order("withdrawal_date", { ascending: false })
      .order("id")
      .range(from, to) as unknown as PromiseLike<{
      data: Row[] | null;
      error: { message: string } | null;
    }>;
  });
}

/**
 * Withdrawals and method-to-method transfers dated in a range, newest first.
 * Row security only lets the store owner read them, so for anyone else this is
 * simply empty.
 * @returns the entries (one branch's when `branchId` is given)
 */
export async function getOwnerWithdrawals(
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId?: string | null,
): Promise<OwnerWithdrawal[]> {
  if (!storeId) return [];
  let rows: Row[];
  try {
    rows = await load("id, amount, payment_method, withdrawal_date, notes, branch_id, kind, to_method", storeId, fromDate, toDate, branchId ?? null);
  } catch {
    // Before the transfers migration there is no kind / to_method: every entry is a withdrawal.
    rows = await load("id, amount, payment_method, withdrawal_date, notes, branch_id", storeId, fromDate, toDate, branchId ?? null);
  }
  return rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    payment_method: r.payment_method,
    withdrawal_date: r.withdrawal_date,
    notes: r.notes,
    branch_id: r.branch_id,
    kind: r.kind === "transfer" ? "transfer" : "withdrawal",
    to_method: r.to_method ?? null,
  }));
}
