import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface CustomerRefund {
  id: string;
  order_id: string | null;
  branch_id: string | null;
  /** Product money handed back. */
  refund_amount: number;
  payment_method: string;
  refund_date: string;
  /** Set when the refund came from returning a paid order: what that order had brought in. */
  received_amount: number;
  /** ...and the day it was counted. */
  received_date: string | null;
  notes: string | null;
}

const COLUMNS =
  "id, order_id, branch_id, refund_amount, payment_method, refund_date, received_amount, received_date, notes";

/**
 * Refunds given back to customers, or, when `by` is "received_date", those whose
 * original sale was counted in the range. Empty before the refunds migration
 * is applied or when the viewer can't read them.
 * @returns the refunds (one branch's when `branchId` is given), newest first
 */
export async function getCustomerRefunds(
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId?: string | null,
  by: "refund_date" | "received_date" = "refund_date",
): Promise<CustomerRefund[]> {
  if (!storeId) return [];
  try {
    const rows = await fetchAllPaged<CustomerRefund>((from, to) => {
      let query = supabase
        .from("customer_refunds")
        .select(COLUMNS)
        .eq("store_id", storeId)
        .gte(by, fromDate)
        .lte(by, toDate);
      if (branchId) query = query.eq("branch_id", branchId);
      return query.order(by, { ascending: false }).order("id").range(from, to) as unknown as PromiseLike<{
        data: CustomerRefund[] | null;
        error: { message: string } | null;
      }>;
    });
    return rows.map((r) => ({
      ...r,
      refund_amount: Number(r.refund_amount),
      received_amount: Number(r.received_amount),
    }));
  } catch {
    return [];
  }
}
