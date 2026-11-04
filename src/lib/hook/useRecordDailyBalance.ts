"use client";

import { useEffect, useRef } from "react";
import type { AccrualStatementsData } from "@/lib/hook/useAccrualStatements";
import { recordDailyBalance } from "@/lib/queries/financial/balanceHistory";

/** At most one copy per scope per hour is sent: the day's copy is the last one, so later visits keep it close to the end of the day. */
const SAVE_EVERY_MS = 60 * 60 * 1000;

/**
 * Keeps the balance history: while the owner uses the dashboard or the Balance Sheet, today's balance is
 * saved (at most once an hour), so a balance for that day can be looked up later. Does nothing for anyone
 * but the owner, and never shows an error: history is a bonus and must not get in the way.
 */
export function useRecordDailyBalance({
  storeId,
  branchId,
  data,
  enabled,
}: {
  storeId: string | null | undefined;
  /** The branch the figures are for; null = the whole store. */
  branchId: string | null;
  data: AccrualStatementsData | null;
  /** Owner only, on a plan that has the Balance Sheet. */
  enabled: boolean;
}): void {
  const lastSaved = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled || !storeId || !data) return;
    const key = `${storeId}:${branchId ?? "all"}`;
    const now = Date.now();
    const last = lastSaved.current.get(key) ?? 0;
    if (now - last < SAVE_EVERY_MS) return;
    lastSaved.current.set(key, now);
    void recordDailyBalance(storeId, { branchId, balance: data.balance, vendorDue: data.vendorDue, cash: data.cash }).catch(() => {
      // Allow another try on the next visit.
      lastSaved.current.delete(key);
    });
  }, [enabled, storeId, branchId, data]);
}
