import { supabase } from "@/lib/supabase";

export interface ProfitLossTrendPoint {
  date: string; // YYYY-MM-DD
  net_profit: number;
}

export interface ProfitLossReport {
  totalSales: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  trend: ProfitLossTrendPoint[];
}

const EMPTY: ProfitLossReport = {
  totalSales: 0,
  cogs: 0,
  grossProfit: 0,
  totalExpenses: 0,
  netProfit: 0,
  trend: [],
};

/**
 * Profit & Loss for an arbitrary date range, via the get_profit_loss_report
 * RPC — see that migration for why cogs is derived rather than its own
 * query, and why the trend is already gap-filled server-side.
 */
export async function getProfitLossReport(
  storeId: string,
  fromDate: string,
  toDate: string,
): Promise<ProfitLossReport> {
  if (!storeId) return EMPTY;

  const { data, error } = await supabase.rpc("get_profit_loss_report", {
    p_store_id: storeId,
    p_period_start: fromDate,
    p_period_end: toDate,
  });

  if (error) {
    console.error("Failed to load profit & loss report:", error.message);
    return EMPTY;
  }

  return {
    totalSales: Number(data.total_sales) || 0,
    cogs: Number(data.cogs) || 0,
    grossProfit: Number(data.gross_profit) || 0,
    totalExpenses: Number(data.total_expenses) || 0,
    netProfit: Number(data.net_profit) || 0,
    trend: (data.trend ?? []).map((p: { date: string; net_profit: number }) => ({
      date: p.date,
      net_profit: Number(p.net_profit) || 0,
    })),
  };
}
