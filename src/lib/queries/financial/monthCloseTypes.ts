import type { AccrualProfitLoss, BalanceSnapshot } from "@/lib/queries/dashboard/getAccrualStatements";
import type { CashPosition } from "./moneyBookTypes";

/** Everything the Balance Sheet page shows, saved when a month is closed. */
export interface MonthCloseSnapshot {
  /** The month's Profit & Loss (without the daily trend). */
  pl: Omit<AccrualProfitLoss, "trend">;
  /** Margin made on vendor sales in the month; part of net profit. */
  vendorProfit: number;
  /** The balance at the moment of closing. */
  balance: BalanceSnapshot;
  /** What vendors owed the store at that moment. */
  vendorDue: number;
  /** Cash & bank, equipment and loans at that moment; null when there was no opening balance or the viewer is not the owner. */
  cash: CashPosition | null;
}

/** A closed month. */
export interface MonthClose {
  id: string;
  /** The branch it covers; null = the whole store. */
  branchId: string | null;
  /** YYYY-MM-DD, the first day of the month. */
  periodStart: string;
  /** YYYY-MM-DD, the last day of the month. */
  periodEnd: string;
  /** When it was closed (ISO timestamp): the balance in the snapshot is as of this moment. */
  closedAt: string;
  snapshot: MonthCloseSnapshot;
}

export interface CloseMonthInput {
  branchId: string | null;
  periodStart: string;
  periodEnd: string;
  snapshot: MonthCloseSnapshot;
}

export type MonthCloseResult = { success: true } | { success: false; error: string };
export type MonthClosesResult = { success: true; closes: MonthClose[] } | { success: false; error: string };
