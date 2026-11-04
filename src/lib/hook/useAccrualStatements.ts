"use client";

import { useEffect, useState } from "react";
import {
  getAccrualProfitLoss,
  getBalanceSnapshot,
  type AccrualProfitLoss,
  type BalanceSnapshot,
} from "@/lib/queries/dashboard/getAccrualStatements";
import { getVendorsOverviewStats } from "@/lib/queries/vendor/getVendorsOverviewStats";
import { getBranchPayable } from "@/lib/queries/supplier/supplierBills";
import { getCashPosition } from "@/lib/queries/financial/getCashPosition";
import type { CashPosition } from "@/lib/queries/financial/moneyBookTypes";

export interface AccrualStatementsData {
  /** This period's Profit & Loss. */
  pl: AccrualProfitLoss;
  /** The period before, for "vs previous"; null on "all time". */
  prevPl: AccrualProfitLoss | null;
  balance: BalanceSnapshot;
  /** What vendors owe the store, for Accounts receivable. */
  vendorDue: number;
  /** Cash & bank, equipment and loans; null until an opening balance is saved, or for anyone but the owner. */
  cash: CashPosition | null;
}

interface UseAccrualStatementsArgs {
  storeId: string | null | undefined;
  /** Stores with branches: one branch. Null = the whole store. */
  branchId: string | null;
  periodStart: string;
  periodEnd: string;
  prevPeriodStart: string;
  prevPeriodEnd: string;
  /** False on "all time": there is no earlier period to compare with. */
  compare: boolean;
  /** Hold off until the branch choice is known. */
  enabled: boolean;
  /** Owner only: also work out Cash & bank (the money pages are hidden from staff). */
  includeCash: boolean;
  /** Stores with branches: changes how money is counted per branch. */
  withBranches: boolean;
}

/**
 * Loads the accrual Profit & Loss (this period and the one before) and the
 * Balance snapshot for the dashboard. `data` stays null until everything has
 * loaded, and stays null if the database functions aren't applied or fail, so
 * callers keep showing the existing figures in that case.
 * @returns the statements (or null) and whether loading has finished
 */
export function useAccrualStatements({
  storeId,
  branchId,
  periodStart,
  periodEnd,
  prevPeriodStart,
  prevPeriodEnd,
  compare,
  enabled,
  includeCash,
  withBranches,
}: UseAccrualStatementsArgs): { data: AccrualStatementsData | null; ready: boolean; error: string | null } {
  const [data, setData] = useState<AccrualStatementsData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || !enabled) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    const report = (message: string) => {
      if (!cancelled) setError((prev) => prev ?? message);
    };
    Promise.all([
      getAccrualProfitLoss(storeId, periodStart, periodEnd, branchId, report),
      compare ? getAccrualProfitLoss(storeId, prevPeriodStart, prevPeriodEnd, branchId, report) : Promise.resolve(null),
      getBalanceSnapshot(storeId, branchId, report),
      getVendorsOverviewStats(storeId, branchId).catch(() => null),
      // Cash is a bonus: if it cannot be worked out the rest of the statements still show.
      includeCash ? getCashPosition(storeId, branchId, withBranches).catch(() => null) : Promise.resolve(null),
    ])
      .then(async ([pl, prevPl, balance, vendorStats, cash]) => {
        if (cancelled) return;
        // A branch owes suppliers for the goods it received: the unpaid part of its own bills. Money paid ahead
        // belongs to no branch. Only for people who may see supplier money (the figure is hidden otherwise).
        let finalBalance = balance;
        if (balance && branchId && balance.accountsPayable !== null) {
          const branchPayable = await getBranchPayable(storeId, branchId).catch(() => null);
          if (branchPayable !== null) finalBalance = { ...balance, accountsPayable: branchPayable, supplierAdvance: 0, payableByBranch: true };
        }
        if (cancelled) return;
        setData(
          pl && finalBalance
            ? { pl, prevPl, balance: finalBalance, vendorDue: Math.max(vendorStats?.branch_due ?? vendorStats?.total_due ?? 0, 0), cash }
            : null,
        );
        setReady(true);
      })
      .catch((err) => {
        console.error("Financial statements failed:", err);
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Financial statements failed");
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, enabled, branchId, periodStart, periodEnd, prevPeriodStart, prevPeriodEnd, compare, includeCash, withBranches]);

  return { data, ready, error };
}
