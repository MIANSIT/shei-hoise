"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { AccrualStatementsData } from "@/lib/hook/useAccrualStatements";

interface MoneyPositionStripProps {
  data: AccrualStatementsData;
  formatMoney: (amount: number) => React.ReactNode;
}

/**
 * Three numbers from the Balance Sheet for the dashboard: cash, what customers,
 * couriers and vendors owe the shop, and what the shop owes. The full statement
 * lives on its own page.
 */
export function MoneyPositionStrip({ data, formatMoney }: MoneyPositionStripProps) {
  const t = useTranslation();
  const { balance, vendorDue, cash } = data;
  const owedToYou = balance.customerDue + balance.codWithCourier + vendorDue;
  // Supplier bills are store-wide; loans come from the Money Book.
  const youOwe = balance.accountsPayable === null && !cash ? null : (balance.accountsPayable ?? 0) + (cash?.loans ?? 0);

  const cells: { key: string; label: string; value: React.ReactNode; tone: string }[] = [
    {
      key: "cash",
      label: t.admin.mpCash,
      value: cash ? formatMoney(cash.total) : "—",
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    { key: "owed", label: t.admin.mpOwedToYou, value: formatMoney(owedToYou), tone: "text-sky-700 dark:text-sky-300" },
    {
      key: "owe",
      label: t.admin.mpYouOwe,
      value: youOwe === null ? "—" : formatMoney(youOwe),
      tone: "text-rose-700 dark:text-rose-300",
    },
  ];

  return (
    <section aria-label={t.admin.mpTitle} className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:shadow-none sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-primary">{t.admin.mpTitle}</h2>
        <Link
          href="/dashboard/balance-sheet"
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
        >
          {t.admin.mpOpen}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cells.map((c) => (
          <div key={c.key} className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="text-xs text-muted-foreground">{c.label}</dt>
            <dd className={`mt-1 text-xl font-extrabold tabular-nums ${c.tone}`}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
