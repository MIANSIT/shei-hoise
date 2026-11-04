import { supabase } from "@/lib/supabase";
import { getVendorProfitByBranch } from "@/lib/queries/vendor/getVendorStoreProfitForPeriod";
import { getAccrualProfitLoss } from "./getAccrualStatements";

export interface BranchComparisonRow {
  branchId: string;
  name: string;
  isActive: boolean;
  orders: number;
  /** Every order in the period that isn't cancelled or returned. */
  sales: number;
  /** The paid part of sales. */
  received: number;
  grossProfit: number;
  /** Cost of goods (TP cost) of those sales; lines with no TP count as 0 here. */
  cogs: number;
  /** Order lines sold with no TP anywhere, and what they sold for. Left out of Profit on TP. */
  missingCostLines: number;
  missingCostSales: number;
  expenses: number;
  /** Profit share of vendor payments this branch received. */
  vendorProfit: number;
  /** Gross profit − expenses + vendor profit. */
  net: number;
  /** Owed right now by customers of this branch. */
  customerDue: number;
  /** Delivered COD orders whose cash the courier hasn't handed over yet. */
  codPending: number;
}

interface ComparisonPayload {
  branch_id: string;
  name: string;
  is_active: boolean;
  orders: number;
  sales: number;
  received?: number;
  gross_profit: number;
  expenses: number;
  net: number;
  customer_due: number;
  cod_pending: number;
}

/**
 * Every branch side by side for a period (stores with branches). Branch
 * rows add up to the brand total: every order, expense and payment sits in
 * exactly one branch.
 * @returns one row per branch the signed-in user can see, by priority
 */
export async function getBranchComparison(
  storeId: string,
  periodStart: string,
  periodEnd: string,
): Promise<BranchComparisonRow[]> {
  const [{ data, error }, vendorByBranch] = await Promise.all([
    supabase.rpc("get_branch_comparison", {
      p_store_id: storeId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    }),
    getVendorProfitByBranch(storeId, periodStart, periodEnd),
  ]);
  if (error) throw new Error(error.message);

  const rows = ((data as ComparisonPayload[] | null) ?? []).map((r) => {
    const vendorProfit = vendorByBranch.get(r.branch_id) ?? 0;
    return {
      branchId: r.branch_id,
      name: r.name,
      isActive: r.is_active,
      orders: Number(r.orders) || 0,
      sales: Number(r.sales) || 0,
      // Older databases only had paid sales under "sales".
      received: r.received !== undefined ? Number(r.received) || 0 : Number(r.sales) || 0,
      grossProfit: Number(r.gross_profit) || 0,
      cogs: 0,
      missingCostLines: 0,
      missingCostSales: 0,
      expenses: Number(r.expenses) || 0,
      vendorProfit,
      net: (Number(r.net) || 0) + vendorProfit,
      customerDue: Number(r.customer_due) || 0,
      codPending: Number(r.cod_pending) || 0,
    } satisfies BranchComparisonRow;
  });

  // The profit columns on the same basis as the dashboard: every sale counts when it is made, with its TP cost
  // (the rollup behind get_branch_comparison counts paid sales only). A branch whose figures cannot be read keeps the rollup's.
  const accrual = await Promise.all(rows.map((r) => getAccrualProfitLoss(storeId, periodStart, periodEnd, r.branchId).catch(() => null)));
  return rows.map((r, i) => {
    const pl = accrual[i];
    if (!pl) return r;
    return {
      ...r,
      orders: pl.ordersCount,
      sales: pl.netRevenue,
      received: pl.collected,
      grossProfit: pl.grossProfit,
      cogs: pl.cogs,
      missingCostLines: pl.missingCostLines,
      missingCostSales: pl.missingCostSales,
      expenses: pl.operatingExpenses,
      net: pl.netProfit + r.vendorProfit,
    };
  });
}
