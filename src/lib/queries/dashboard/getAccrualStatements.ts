import { supabase } from "@/lib/supabase";

export interface AccrualTrendPoint {
  date: string; // YYYY-MM-DD
  net_profit: number;
}

/** Profit & Loss for a period on one basis: every order that isn't cancelled or returned, paid or not. */
export interface AccrualProfitLoss {
  netRevenue: number;
  /** The paid part of netRevenue. */
  collected: number;
  /** netRevenue − collected: shows as Accounts receivable on the Balance tab. */
  uncollected: number;
  ordersCount: number;
  cogs: number;
  grossProfit: number;
  /** Order lines sold with no TP anywhere (0 until migration 20261117 is applied). */
  missingCostLines: number;
  /** What those lines sold for, before discount. They are counted as free in cogs, so gross profit is overstated by this much. */
  missingCostSales: number;
  operatingExpenses: number;
  /** Courier cost minus what customers were charged; negative means delivery earned money. */
  netDeliveryCost: number;
  /** Always 0 now: only sales and expenses make profit. Kept so months closed before the Money Book went away still show their line. */
  otherIncome: number;
  /** Store only: grossProfit − expenses − netDeliveryCost. Vendor margin is added by the caller. */
  netProfit: number;
  trend: AccrualTrendPoint[];
}

/** What the business owns and owes right now (cash & bank comes in a later phase). */
export interface BalanceSnapshot {
  inventoryAtCost: number;
  inventoryAtSelling: number;
  inventoryUnits: number;
  /** In-stock lines with no cost price: counted as 0 in inventoryAtCost. */
  itemsWithoutCost: number;
  customerDue: number;
  codWithCourier: number;
  /** Supplier bills − payments. Null when the person may not see supplier money or the ledger isn't there. */
  accountsPayable: number | null;
  /** Paid to suppliers above their bills, kept with them: an asset. 0 until migration 20261118 is applied. */
  supplierAdvance: number;
  /** True when accountsPayable is one branch's own bills (goods it received) rather than the whole store's. */
  payableByBranch?: boolean;
}

const num = (v: unknown): number => Number(v) || 0;

/**
 * Profit & Loss on the accrual basis, via get_profit_loss_accrual.
 * @returns the figures, or null when the database function isn't there yet or the call fails
 */
export async function getAccrualProfitLoss(
  storeId: string,
  fromDate: string,
  toDate: string,
  branchId?: string | null,
  /** Told why it returned null, so a screen can show the reason. */
  onError?: (message: string) => void,
): Promise<AccrualProfitLoss | null> {
  if (!storeId) return null;
  const { data, error } = await supabase.rpc("get_profit_loss_accrual", {
    p_store_id: storeId,
    p_period_start: fromDate,
    p_period_end: toDate,
    ...(branchId ? { p_branch_id: branchId } : {}),
  });
  if (error || !data) {
    if (error) {
      console.error("get_profit_loss_accrual failed:", error.message);
      onError?.(`get_profit_loss_accrual: ${error.message}`);
    }
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    netRevenue: num(row.net_revenue),
    collected: num(row.collected),
    uncollected: num(row.uncollected),
    ordersCount: num(row.orders_count),
    cogs: num(row.cogs),
    grossProfit: num(row.gross_profit),
    missingCostLines: num(row.missing_cost_lines),
    missingCostSales: num(row.missing_cost_sales),
    operatingExpenses: num(row.total_expenses),
    netDeliveryCost: num(row.delivery_net_cost),
    otherIncome: 0,
    netProfit: num(row.net_profit),
    trend: ((row.trend as { date: string; net_profit: number }[] | null) ?? []).map((p) => ({
      date: String(p.date).slice(0, 10),
      net_profit: num(p.net_profit),
    })),
  };
}

/**
 * The Balance snapshot for the whole store or one branch, via get_balance_snapshot.
 * @returns the figures, or null when the database function isn't there yet or the call fails
 */
export async function getBalanceSnapshot(
  storeId: string,
  branchId?: string | null,
  /** Told why it returned null, so a screen can show the reason. */
  onError?: (message: string) => void,
): Promise<BalanceSnapshot | null> {
  if (!storeId) return null;
  const { data, error } = await supabase.rpc("get_balance_snapshot", {
    p_store_id: storeId,
    ...(branchId ? { p_branch_id: branchId } : {}),
  });
  if (error || !data) {
    if (error) {
      console.error("get_balance_snapshot failed:", error.message);
      onError?.(`get_balance_snapshot: ${error.message}`);
    }
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    inventoryAtCost: num(row.inventory_cost),
    inventoryAtSelling: num(row.inventory_sell),
    inventoryUnits: num(row.inventory_units),
    itemsWithoutCost: num(row.items_without_cost),
    customerDue: num(row.customer_due),
    codWithCourier: num(row.cod_pending),
    accountsPayable: row.accounts_payable === null || row.accounts_payable === undefined ? null : num(row.accounts_payable),
    supplierAdvance: num(row.supplier_advance),
  };
}
