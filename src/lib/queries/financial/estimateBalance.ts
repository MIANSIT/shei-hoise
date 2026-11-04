import { supabase } from "@/lib/supabase";
import type { BalanceSnapshot } from "@/lib/queries/dashboard/getAccrualStatements";
import { getCashPosition } from "./getCashPosition";
import type { EstimatedBalance } from "./balanceHistoryTypes";

const num = (v: unknown): number => Number(v) || 0;

/**
 * The balance for a past day that has no saved copy, worked out from dated records (get_balance_estimate
 * for stock, dues, COD, supplier bills and vendors; the Money Book and Money Overview for cash). From the day
 * the order and cost history started it is exact as the records stand (fromHistory); before that it is an
 * estimate. See the migrations for what each line assumes.
 * @param includeCash owner only: cash is read from the owner-only money pages
 * @returns the estimate, or null when the database function is not there yet or fails
 */
export async function estimateBalanceOnDate(
  storeId: string,
  branchId: string | null,
  date: string,
  includeCash: boolean,
  withBranches: boolean,
): Promise<EstimatedBalance | null> {
  const { data, error } = await supabase.rpc("get_balance_estimate", {
    p_store_id: storeId,
    p_branch_id: branchId,
    p_date: date,
  });
  if (error || !data) {
    if (error) console.error("get_balance_estimate failed:", error.message);
    return null;
  }
  const row = data as Record<string, unknown>;
  const balance: BalanceSnapshot = {
    inventoryAtCost: num(row.inventory_cost),
    inventoryAtSelling: num(row.inventory_sell),
    inventoryUnits: num(row.inventory_units),
    itemsWithoutCost: num(row.items_without_cost),
    customerDue: num(row.customer_due),
    codWithCourier: num(row.cod_pending),
    accountsPayable: row.accounts_payable === null || row.accounts_payable === undefined ? null : num(row.accounts_payable),
    supplierAdvance: num(row.supplier_advance),
  };
  // Cash is a bonus: if it cannot be worked out the rest of the estimate still shows.
  const cash = includeCash ? await getCashPosition(storeId, branchId, withBranches, date).catch(() => null) : null;
  return { date, balance, vendorDue: num(row.vendor_due), cash, fromHistory: row.from_history === true };
}
