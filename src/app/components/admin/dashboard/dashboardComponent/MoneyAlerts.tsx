"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { usePermissions } from "@/lib/context/PermissionsContext";
import {
  loadMoneyAlerts,
  BILL_SOON_DAYS,
  COD_STUCK_DAYS,
  OLD_DUE_DAYS,
  type MoneyAlert,
  type MoneyAlertKind,
} from "@/lib/queries/dashboard/getMoneyAlerts";
import type { CashPosition } from "@/lib/queries/financial/moneyBookTypes";

interface MoneyAlertsProps {
  storeId: string | null | undefined;
  /** Stores with branches: one branch's customer dues and COD; null = the whole store. */
  branchId: string | null;
  withBranches: boolean;
  /** Owner only; lets the alerts notice cash that has gone below zero. */
  cash: CashPosition | null;
  formatMoney: (amount: number) => React.ReactNode;
}

const TONE: Record<MoneyAlert["severity"], string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
};

/**
 * Things about the shop's money that need a look today: supplier bills overdue or due soon,
 * customer dues over 30 days, courier cash waiting over 7 days, and cash below zero. Shows
 * nothing when there is nothing to flag, and only the sources the person may see.
 */
export function MoneyAlerts({ storeId, branchId, withBranches, cash, formatMoney }: MoneyAlertsProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { can } = usePermissions();
  const { allowed: stockAllowed } = useFeatureGate(storeId, "stock_management");
  const canSeeBills = stockAllowed && can("stock.supplier_money");
  const canSeeDues = can("customers.view");
  const canSeeCod = can("cod.view");

  const [alerts, setAlerts] = useState<MoneyAlert[]>([]);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    loadMoneyAlerts({ storeId, branchId, withBranches, canSeeBills, canSeeDues, canSeeCod, cash })
      .then((result) => {
        if (!cancelled) setAlerts(result);
      })
      .catch((err) => {
        console.error("Money alerts failed:", err);
        if (!cancelled) setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, branchId, withBranches, canSeeBills, canSeeDues, canSeeCod, cash]);

  if (alerts.length === 0) return null;

  const title: Record<MoneyAlertKind, string> = {
    billsOverdue: t.admin.maBillsOverdue,
    billsDueSoon: t.admin.maBillsDueSoon.replace("{days}", n(String(BILL_SOON_DAYS))),
    oldDues: t.admin.maOldDues.replace("{days}", n(String(OLD_DUE_DAYS))),
    codStuck: t.admin.maCodStuck.replace("{days}", n(String(COD_STUCK_DAYS))),
    negativeCash: t.admin.maNegativeCash,
  };
  const hint: Record<MoneyAlertKind, string> = {
    billsOverdue: t.admin.maBillsOverdueHint,
    billsDueSoon: t.admin.maBillsDueSoonHint,
    oldDues: t.admin.maOldDuesHint,
    codStuck: t.admin.maCodStuckHint,
    negativeCash: t.admin.maNegativeCashHint,
  };

  return (
    <section aria-label={t.admin.maTitle} className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:shadow-none sm:p-5">
      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-primary">
        <AlertTriangle size={14} aria-hidden="true" />
        {t.admin.maTitle}
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {alerts.map((a) => (
          <li key={a.kind}>
            <Link href={a.href} className={`flex h-full flex-col gap-1 rounded-xl border p-4 transition-opacity hover:opacity-90 ${TONE[a.severity]}`}>
              <span className="text-xs font-semibold">{title[a.kind]}</span>
              <span className="text-xl font-extrabold tabular-nums">{formatMoney(a.amount)}</span>
              <span className="text-[11px] opacity-90">{hint[a.kind].replace("{n}", n(String(a.count)))}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                {t.admin.maOpen}
                <ArrowRight size={12} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
