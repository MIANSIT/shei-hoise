import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface VendorSalesResult {
  /** Confirmed vendor orders dated in the period: the goods only (items − discount). Delivery is billed on top and shown apart. */
  vendor_sales: number;
  prev_vendor_sales: number;
  /** Delivery charged to vendors on those orders. It is owed by the vendor but is not product sales. */
  vendor_delivery: number;
}

interface VendorSalesRow {
  order_date: string;
  subtotal: number;
  discount_amount: number;
  delivery_cost: number | null;
}

/**
 * Vendor sales for the current and previous period: the grand total of every
 * confirmed vendor order's goods (items minus discount), by order date, with the delivery billed on those orders
 * alongside. Drafts and cancelled orders don't count. Stores with branches: pass branchId for the branch the goods left.
 * @returns the totals, zero when nothing is found or the query fails
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
        .select("order_date, subtotal, discount_amount, delivery_cost")
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

    const inRange = (start: string, end: string) => rows.filter((r) => r.order_date >= start && r.order_date <= end);
    const goods = (list: VendorSalesRow[]) => list.reduce((sum, r) => sum + Number(r.subtotal) - Number(r.discount_amount), 0);

    return {
      vendor_sales: goods(inRange(periodStart, periodEnd)),
      prev_vendor_sales: goods(inRange(prevPeriodStart, prevPeriodEnd)),
      vendor_delivery: inRange(periodStart, periodEnd).reduce((sum, r) => sum + Number(r.delivery_cost ?? 0), 0),
    };
  } catch (error) {
    console.error("Failed to load vendor sales:", error);
    return { vendor_sales: 0, prev_vendor_sales: 0, vendor_delivery: 0 };
  }
}
