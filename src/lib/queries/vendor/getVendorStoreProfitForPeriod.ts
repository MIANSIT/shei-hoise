import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface VendorStoreProfitResult {
  vendor_profit: number;
  prev_vendor_profit: number;
}

/**
 * Vendor profit for the current and previous period, counted as vendors pay.
 *
 * For each vendor:
 *   profit share = (vendor_tp − original_tp) × qty  ÷  (vendor_tp × qty + delivery cost)
 *   profit       = payments in the period × profit share
 *
 * So a vendor paying little by little shows profit little by little, and an
 * unpaid bill shows none. Paged because a single request is capped at
 * PGRST_DB_MAX_ROWS (1000).
 *
 * Stores with branches: profit belongs to the branch that received the
 * payment (vendor_payments.branch_id); pass branchId for one branch.
 */
export async function getVendorStoreProfitForPeriod(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
  branchId?: string | null,
): Promise<VendorStoreProfitResult> {
  try {
    const shareOf = await loadVendorProfitShares(storeId);
    const [payments, prevPayments] = await Promise.all([
      loadVendorPayments(storeId, periodStart, periodEnd, branchId ?? null),
      loadVendorPayments(storeId, prevPeriodStart, prevPeriodEnd, branchId ?? null),
    ]);

    const profitFrom = (list: VendorPaymentRow[]) =>
      list.reduce((sum, p) => sum + Number(p.amount) * shareOf(p.vendor_id), 0);

    return {
      vendor_profit: profitFrom(payments),
      prev_vendor_profit: profitFrom(prevPayments),
    };
  } catch (error) {
    console.error("Failed to load vendor profit:", error);
    return { vendor_profit: 0, prev_vendor_profit: 0 };
  }
}

/** Vendor profit for one period, per branch (branch id → profit). */
export async function getVendorProfitByBranch(
  storeId: string,
  periodStart: string,
  periodEnd: string,
): Promise<Map<string, number>> {
  const byBranch = new Map<string, number>();
  try {
    const [shareOf, payments] = await Promise.all([
      loadVendorProfitShares(storeId),
      loadVendorPayments(storeId, periodStart, periodEnd),
    ]);
    for (const p of payments) {
      if (!p.branch_id) continue;
      byBranch.set(p.branch_id, (byBranch.get(p.branch_id) ?? 0) + Number(p.amount) * shareOf(p.vendor_id));
    }
  } catch (error) {
    console.error("Failed to load vendor profit by branch:", error);
  }
  return byBranch;
}

interface VendorPaymentRow {
  vendor_id: string;
  amount: number;
  branch_id?: string | null;
}

/**
 * Payments in a date range. branch_id is only read when branches are in
 * play, so stores without branches never depend on that column.
 * `branchId` undefined = every payment with its branch; null = every
 * payment; a string = that branch's payments only.
 */
function loadVendorPayments(
  storeId: string,
  start: string,
  end: string,
  branchId?: string | null,
): Promise<VendorPaymentRow[]> {
  const withBranch = branchId !== null;
  return fetchAllPaged<VendorPaymentRow>((from, to) => {
    let query = supabase
      .from("vendor_payments")
      .select(withBranch ? "vendor_id, amount, branch_id" : "vendor_id, amount")
      .eq("store_id", storeId)
      .gte("payment_date", start)
      .lte("payment_date", end);
    if (branchId) query = query.eq("branch_id", branchId);
    return query.order("id").range(from, to) as unknown as PromiseLike<{
      data: VendorPaymentRow[] | null;
      error: { message: string } | null;
    }>;
  });
}

/** Each vendor's profit share: margin ÷ (bill incl. delivery). */
async function loadVendorProfitShares(storeId: string): Promise<(vendorId: string) => number> {
  const orders = await fetchAllPaged((from, to) =>
    supabase
      .from("vendor_orders")
      .select("vendor_id, delivery_cost, items:vendor_order_items(quantity, vendor_tp, original_tp)")
      .eq("store_id", storeId)
      .eq("status", "confirmed")
      .order("id")
      .range(from, to),
  );

  const totals = new Map<string, { bill: number; margin: number }>();
  for (const order of orders) {
    const t = totals.get(order.vendor_id) ?? { bill: 0, margin: 0 };
    t.bill += Number(order.delivery_cost ?? 0);
    for (const item of order.items) {
      t.bill += item.quantity * Number(item.vendor_tp);
      t.margin += item.quantity * (Number(item.vendor_tp) - Number(item.original_tp));
    }
    totals.set(order.vendor_id, t);
  }
  return (vendorId) => {
    const t = totals.get(vendorId);
    return t && t.bill > 0 ? t.margin / t.bill : 0;
  };
}
