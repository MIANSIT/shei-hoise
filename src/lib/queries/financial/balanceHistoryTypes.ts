import type { BalanceSnapshot } from "@/lib/queries/dashboard/getAccrualStatements";
import type { CashPosition } from "./moneyBookTypes";

/** The balance as it stood when it was saved. */
export interface DailyBalance {
  /** YYYY-MM-DD, the day it is for. */
  date: string;
  /** When the last copy of that day was taken (ISO timestamp). */
  savedAt: string;
  balance: BalanceSnapshot;
  /** What vendors owed the store. */
  vendorDue: number;
  /** Null when there was no opening balance, or the viewer is not the owner. */
  cash: CashPosition | null;
}

export interface RecordDailyBalanceInput {
  /** The branch the figures are for; null = the whole store. */
  branchId: string | null;
  balance: BalanceSnapshot;
  vendorDue: number;
  cash: CashPosition | null;
}

export type BalanceOnDateResult =
  | {
      success: true;
      /** The balance saved for the asked day, or null when none was. */
      found: DailyBalance | null;
      /** The nearest day before / after the asked day that has a saved balance (YYYY-MM-DD). */
      earlier: string | null;
      later: string | null;
    }
  | { success: false; error: string };

/** A balance worked out afterwards for a day with no saved copy. An estimate, never exact. */
export interface EstimatedBalance {
  /** YYYY-MM-DD, the day it is for. */
  date: string;
  balance: BalanceSnapshot;
  vendorDue: number;
  /** Null when there was no opening balance by then, or the viewer is not the owner. */
  cash: CashPosition | null;
  /** True when the day is on or after the moment the order and cost history started, so dues, courier cash and stock value come from the records of that day (exact as the records stand). False = an estimate. */
  fromHistory: boolean;
}
