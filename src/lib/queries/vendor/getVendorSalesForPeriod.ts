import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface VendorSalesResult {
  /** Confirmed vendor orders dated in the period (items + delivery − discount). */
  vendor_sales: number;
  prev_vendor_sales: number;
}

interface VendorSalesRow {
  order_date: string;
  grand_total: number;
}

/**
 * Vendor sales for the current and previous period: the grand total of every
 * confirmed vendor order, by order date. Drafts and cancelled orders don't
 * count. Stores with branches: pass branchId for the branch the goods left.
 * @returns both totals, zero when nothing is found or the query fails
 */
export async function getVendorSalesForPeriod(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
  branchId?: string | null,
): Promise<VendorSalesResult> {
  try {
    const earliest = prevPeriodStart < periodStart ? prevPeriodStart : periodStart;
    const rows = await fetchAllPaged<VendorSalesRow>((from, to) => {
      let query = supabase
        .from("vendor_orders")
        .select("order_date, grand_total")
        .eq("store_id", storeId)
        .eq("status", "confirmed")
        .gte("order_date", earliest)
        .lte("order_date", periodEnd);
      if (branchId) query = query.eq("branch_id", branchId);
      return query.order("id").range(from, to) as unknown as PromiseLike<{
        data: VendorSalesRow[] | null;
        error: { message: string } | null;
      }>;
    });

    const sumIn = (start: string, end: string) =>
      rows
        .filter((r) => r.order_date >= start && r.order_date <= end)
        .reduce((sum, r) => sum + Number(r.grand_total), 0);

    return {
      vendor_sales: sumIn(periodStart, periodEnd),
      prev_vendor_sales: sumIn(prevPeriodStart, prevPeriodEnd),
    };
  } catch (error) {
    console.error("Failed to load vendor sales:", error);
    return { vendor_sales: 0, prev_vendor_sales: 0 };
  }
}
