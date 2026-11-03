import { supabase } from "@/lib/supabase";
import { getVendorProfitByDay, getVendorStoreProfitForPeriod } from "@/lib/queries/vendor/getVendorStoreProfitForPeriod";
import { getVendorSalesForPeriod } from "@/lib/queries/vendor/getVendorSalesForPeriod";
import { getSalesSummary } from "./getSalesSummary";
import { getAccrualProfitLoss } from "./getAccrualStatements";

export interface ProfitLossTrendPoint {
  date: string; // YYYY-MM-DD
  net_profit: number;
}

export interface ProfitLossReport {
  /**
   * "accrual": every order that is not cancelled or returned counts as revenue, paid or not, and its cost counts with it.
   * "paid": the older view, worked out on paid orders only (used when the accrual function is not in the database).
   */
  basis: "accrual" | "paid";
  /** Every order that isn't cancelled or returned, paid or not. */
  salesAll: number;
  /** Sales − received. */
  toCollect: number;
  /** Confirmed vendor orders dated in the period (goods + delivery − discount). Kept apart from `salesAll`, which is the store's own orders only. */
  vendorSales: number;
  /** Received: paid sales, the base the profit is worked out on. */
  totalSales: number;
  /** Packaging/handling/etc. charged to the customer on paid orders. Already inside totalSales — shown on its own so it isn't hidden. */
  additionalCharges: number;
  cogs: number;
  grossProfit: number;
  /** Order lines sold with no TP (accrual basis only; they count as free in cogs). */
  missingCostLines: number;
  /** What those lines sold for. */
  missingCostSales: number;
  totalExpenses: number;
  /** What was actually paid to the courier minus what was charged the customer for shipping — positive eats into profit, negative is extra income from shipping. Already netted into netProfit; shown on its own so it isn't hidden. */
  deliveryNetCost: number;
  /** Margin recognized from vendor payments received this period — the same figure the main Dashboard's Net Profit already folds in (getVendorStoreProfitForPeriod). Also netted into netProfit here so a store using vendor distribution doesn't see two different "Net Profit" numbers between Dashboard and this report. */
  vendorProfit: number;
  netProfit: number;
  trend: ProfitLossTrendPoint[];
}

const EMPTY: ProfitLossReport = {
  basis: "paid",
  salesAll: 0,
  toCollect: 0,
  vendorSales: 0,
  totalSales: 0,
  additionalCharges: 0,
  cogs: 0,
  grossProfit: 0,
  missingCostLines: 0,
  missingCostSales: 0,
  totalExpenses: 0,
  deliveryNetCost: 0,
  vendorProfit: 0,
  netProfit: 0,
  trend: [],
};

/**
 * Profit & Loss for an arbitrary date range, via the get_profit_loss_report
 * RPC — see that migration for why cogs is its own query (not derived from
 * gross_profit) and why the trend is already gap-filled server-side.
 */
export async function getProfitLossReport(
  storeId: string,
  fromDate: string,
  toDate: string,
  /** Stores with branches: one branch's P&L. Omitted/null = the whole store. */
  branchId?: string | null,
): Promise<ProfitLossReport> {
  if (!storeId) return EMPTY;

  const [{ data, error }, vendorProfitResult, salesSummary, vendorProfitByDay, vendorSalesResult, accrual] = await Promise.all([
    supabase.rpc("get_profit_loss_report", {
      p_store_id: storeId,
      p_period_start: fromDate,
      p_period_end: toDate,
      ...(branchId ? { p_branch_id: branchId } : {}),
    }),
    // No "previous period" concept in this report — same range twice, only
    // vendor_profit (not prev_vendor_profit) is used below.
    getVendorStoreProfitForPeriod(storeId, fromDate, toDate, fromDate, toDate, branchId ?? null),
    getSalesSummary(storeId, fromDate, toDate, null, null, branchId),
    // The trend needs vendor profit day by day, so its points add up to the headline net profit.
    getVendorProfitByDay(storeId, fromDate, toDate, branchId ?? null),
    // Same range twice — only vendor_sales (not prev_vendor_sales) is used.
    getVendorSalesForPeriod(storeId, fromDate, toDate, fromDate, toDate, branchId ?? null),
    // One basis for revenue, cost and profit. Null when the database function is not there, and the older figures are used.
    getAccrualProfitLoss(storeId, fromDate, toDate, branchId ?? null),
  ]);

  if (accrual) {
    const accrualVendorProfit = vendorProfitResult.vendor_profit;
    return {
      basis: "accrual",
      salesAll: accrual.netRevenue,
      toCollect: accrual.uncollected,
      vendorSales: vendorSalesResult.vendor_sales,
      totalSales: accrual.netRevenue,
      additionalCharges: 0,
      cogs: accrual.cogs,
      grossProfit: accrual.grossProfit,
      missingCostLines: accrual.missingCostLines,
      missingCostSales: accrual.missingCostSales,
      totalExpenses: accrual.operatingExpenses,
      deliveryNetCost: accrual.netDeliveryCost,
      vendorProfit: accrualVendorProfit,
      netProfit: accrual.netProfit + accrualVendorProfit,
      trend: accrual.trend.map((p) => ({
        date: p.date,
        net_profit: p.net_profit + (vendorProfitByDay.get(String(p.date).slice(0, 10)) ?? 0),
      })),
    };
  }

  if (error) {
    console.error("Failed to load profit & loss report:", error.message);
    return EMPTY;
  }

  const vendorProfit = vendorProfitResult.vendor_profit;

  const received = Number(data.total_sales) || 0;
  return {
    basis: "paid",
    salesAll: salesSummary?.sales ?? received,
    toCollect: salesSummary?.toCollect ?? 0,
    vendorSales: vendorSalesResult.vendor_sales,
    totalSales: received,
    additionalCharges: Number(data.additional_charges) || 0,
    cogs: Number(data.cogs) || 0,
    grossProfit: Number(data.gross_profit) || 0,
    missingCostLines: 0,
    missingCostSales: 0,
    totalExpenses: Number(data.total_expenses) || 0,
    deliveryNetCost: Number(data.delivery_net_cost) || 0,
    vendorProfit,
    netProfit: (Number(data.net_profit) || 0) + vendorProfit,
    trend: (data.trend ?? []).map((p: { date: string; net_profit: number }) => ({
      date: p.date,
      net_profit: (Number(p.net_profit) || 0) + (vendorProfitByDay.get(String(p.date).slice(0, 10)) ?? 0),
    })),
  };
}
