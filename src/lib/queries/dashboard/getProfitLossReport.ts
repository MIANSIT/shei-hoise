import { supabase } from "@/lib/supabase";
import { getVendorStoreProfitForPeriod } from "@/lib/queries/vendor/getVendorStoreProfitForPeriod";

export interface ProfitLossTrendPoint {
  date: string; // YYYY-MM-DD
  net_profit: number;
}

export interface ProfitLossReport {
  totalSales: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  /** What was actually paid to the courier minus what was charged the customer for shipping — positive eats into profit, negative is extra income from shipping. Already netted into netProfit; shown on its own so it isn't hidden. */
  deliveryNetCost: number;
  /** Realized margin from vendor/dropship settlements this period — the same figure the main Dashboard's Net Profit already folds in (getVendorStoreProfitForPeriod). Also netted into netProfit here so a store using vendor distribution doesn't see two different "Net Profit" numbers between Dashboard and this report. */
  vendorProfit: number;
  netProfit: number;
  trend: ProfitLossTrendPoint[];
}

const EMPTY: ProfitLossReport = {
  totalSales: 0,
  cogs: 0,
  grossProfit: 0,
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
): Promise<ProfitLossReport> {
  if (!storeId) return EMPTY;

  const [{ data, error }, vendorProfitResult] = await Promise.all([
    supabase.rpc("get_profit_loss_report", {
      p_store_id: storeId,
      p_period_start: fromDate,
      p_period_end: toDate,
    }),
    // No "previous period" concept in this report — same range twice, only
    // vendor_profit (not prev_vendor_profit) is used below.
    getVendorStoreProfitForPeriod(storeId, fromDate, toDate, fromDate, toDate),
  ]);

  if (error) {
    console.error("Failed to load profit & loss report:", error.message);
    return EMPTY;
  }

  const vendorProfit = vendorProfitResult.vendor_profit;

  return {
    totalSales: Number(data.total_sales) || 0,
    cogs: Number(data.cogs) || 0,
    grossProfit: Number(data.gross_profit) || 0,
    totalExpenses: Number(data.total_expenses) || 0,
    deliveryNetCost: Number(data.delivery_net_cost) || 0,
    vendorProfit,
    netProfit: (Number(data.net_profit) || 0) + vendorProfit,
    trend: (data.trend ?? []).map((p: { date: string; net_profit: number }) => ({
      date: p.date,
      net_profit: Number(p.net_profit) || 0,
    })),
  };
}
