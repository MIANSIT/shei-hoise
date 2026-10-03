import { supabase } from "@/lib/supabase";

export interface SalesSummary {
  /** Every order that isn't cancelled or returned (items − discount + extra charges). */
  sales: number;
  salesCount: number;
  /** The part of sales already paid. */
  received: number;
  /** Sales − received: dues and COD not handed over yet. */
  toCollect: number;
  prevSales: number;
}

/**
 * Sales, received and to-collect for a period (one branch or the whole
 * store), via the get_sales_summary RPC. Null when the database doesn't have
 * it yet, so callers can fall back to the paid figure they already have.
 * @returns the summary, or null if unavailable
 */
export async function getSalesSummary(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart?: string | null,
  prevPeriodEnd?: string | null,
  branchId?: string | null,
): Promise<SalesSummary | null> {
  const { data, error } = await supabase.rpc("get_sales_summary", {
    p_store_id: storeId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_prev_period_start: prevPeriodStart ?? null,
    p_prev_period_end: prevPeriodEnd ?? null,
    ...(branchId ? { p_branch_id: branchId } : {}),
  });
  if (error || !data) {
    if (error) console.error("get_sales_summary failed:", error.message);
    return null;
  }
  const row = data as { sales: number; sales_count: number; received: number; prev_sales: number };
  const sales = Number(row.sales) || 0;
  const received = Number(row.received) || 0;
  return {
    sales,
    salesCount: Number(row.sales_count) || 0,
    received,
    toCollect: Math.max(sales - received, 0),
    prevSales: Number(row.prev_sales) || 0,
  };
}
