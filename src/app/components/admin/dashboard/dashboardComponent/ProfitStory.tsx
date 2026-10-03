"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

export interface ProfitStoryFigures {
  /** Paid sales (excl. shipping). */
  sales: number;
  /** Sales − cost of goods and delivery. */
  grossProfit: number;
  expenses: number;
  /** Profit share of vendor payments received. */
  vendorProfit: number;
  /** grossProfit − expenses + vendorProfit. */
  netProfit: number;
  /** % change of net profit vs the previous period; null when there's nothing to compare (all time). */
  netChangePct: number | null;
  /**
   * Profit & Loss page: courier cost beyond the delivery charge, shown as its
   * own line (negative = delivery earned money). When given, the cost line is
   * goods only. The dashboard leaves it out: its gross profit already
   * includes delivery.
   */
  deliveryCost?: number;
  /**
   * Every order in the period, paid or not. When given, the card shows
   * Sales · Received · To collect, and the profit steps start from
   * "Sales received" — profit is only counted on money that came in.
   */
  allSales?: number;
}

interface ProfitStoryProps {
  figures: ProfitStoryFigures;
  periodLabel: string;
  formatMoney: (amount: number) => React.ReactNode;
}

interface Step {
  key: string;
  label: string;
  hint: string;
  amount: number;
  sign: "+" | "−" | "=";
  tone: "sales" | "cost" | "subtotal" | "bonus";
}

const isZero = (amount: number) => Math.abs(amount) < 0.005;

const BAR: Record<Step["tone"], string> = {
  sales: "bg-sky-500",
  cost: "bg-rose-400",
  subtotal: "bg-indigo-500",
  bonus: "bg-teal-500",
};

/**
 * Profit & loss as a short story: what came in, what it cost, what's left.
 * Each line says in plain words what the number is, and the bars show how
 * big each part is next to sales, so the owner sees at a glance where the
 * money went.
 */
export function ProfitStory({ figures, periodLabel, formatMoney }: ProfitStoryProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { sales, grossProfit, expenses, vendorProfit, netProfit, netChangePct, deliveryCost, allSales } = figures;
  const showCollection = allSales !== undefined;
  const toCollect = showCollection ? Math.max(allSales - sales, 0) : 0;
  const receivedPct = showCollection && allSales > 0 ? Math.min((sales / allSales) * 100, 100) : 100;
  const separateDelivery = deliveryCost !== undefined;
  const cost = Math.max(sales - grossProfit, 0);
  const isLoss = netProfit < 0;
  const margin = sales > 0 ? (netProfit / sales) * 100 : null;

  const steps: Step[] = [
    showCollection
      ? { key: "sales", label: t.admin.psSalesReceived, hint: t.admin.psSalesReceivedHint, amount: sales, sign: "+", tone: "sales" }
      : { key: "sales", label: t.admin.psSales, hint: t.admin.psSalesHint, amount: sales, sign: "+", tone: "sales" },
    separateDelivery
      ? { key: "cost", label: t.admin.psCostGoods, hint: t.admin.psCostGoodsHint, amount: cost, sign: "−", tone: "cost" }
      : { key: "cost", label: t.admin.psCost, hint: t.admin.psCostHint, amount: cost, sign: "−", tone: "cost" },
    { key: "gross", label: t.admin.psGross, hint: t.admin.psGrossHint, amount: grossProfit, sign: "=", tone: "subtotal" },
    { key: "expenses", label: t.admin.psExpenses, hint: t.admin.psExpensesHint, amount: expenses, sign: "−", tone: "cost" },
    ...(separateDelivery && Math.abs(deliveryCost) > 0.005
      ? [
          deliveryCost > 0
            ? { key: "delivery", label: t.admin.psDelivery, hint: t.admin.psDeliveryHint, amount: deliveryCost, sign: "−" as const, tone: "cost" as const }
            : { key: "delivery", label: t.admin.psDelivery, hint: t.admin.psDeliveryGainHint, amount: -deliveryCost, sign: "+" as const, tone: "bonus" as const },
        ]
      : []),
    ...(Math.abs(vendorProfit) > 0.005
      ? [{ key: "vendor", label: t.admin.psVendor, hint: t.admin.psVendorHint, amount: vendorProfit, sign: "+" as const, tone: "bonus" as const }]
      : []),
  ];
  // Bars are measured against the biggest figure so every line is comparable.
  const scale = Math.max(
    sales,
    cost,
    Math.abs(grossProfit),
    expenses,
    Math.abs(vendorProfit),
    Math.abs(netProfit),
    Math.abs(deliveryCost ?? 0),
    1,
  );

  const ChangeIcon = netChangePct == null || netChangePct === 0 ? Minus : netChangePct > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm dark:shadow-none overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* The answer first: profit or loss, in one big number. */}
        <div
          className={`lg:col-span-2 p-5 sm:p-6 flex flex-col justify-between gap-4 ${
            isLoss
              ? "bg-linear-to-br from-rose-500 to-red-600"
              : "bg-linear-to-br from-emerald-500 to-teal-600"
          } text-white`}
        >
          <div className="flex items-center gap-2 text-white/85 text-xs font-semibold uppercase tracking-wider">
            {isLoss ? <TrendingDown size={16} aria-hidden="true" /> : <TrendingUp size={16} aria-hidden="true" />}
            {periodLabel}
          </div>
          <div>
            <div className="text-sm font-medium text-white/90">{isLoss ? t.admin.psYouLost : t.admin.psYouMade}</div>
            <div className="text-3xl sm:text-4xl font-black tabular-nums leading-tight mt-1">
              {formatMoney(Math.abs(netProfit))}
            </div>
            <div className="text-xs text-white/85 mt-1">{isLoss ? t.admin.psLossExplain : t.admin.psProfitExplain}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {margin != null && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {t.admin.psMargin}: {n(margin.toFixed(1))}%
              </span>
            )}
            {netChangePct != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                <ChangeIcon size={13} aria-hidden="true" />
                {netChangePct === 0
                  ? t.admin.psSameAsBefore
                  : (netChangePct > 0 ? t.admin.psMoreThanBefore : t.admin.psLessThanBefore).replace(
                      "{pct}",
                      n(Math.abs(netChangePct).toFixed(1)),
                    )}
              </span>
            )}
          </div>
        </div>

        {/* How we got there, line by line. */}
        <div className="lg:col-span-3 p-4 sm:p-6">
          {showCollection && (
            <div className="mb-5 rounded-xl border border-border bg-muted/40 p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.psSalesAll}</div>
                  <div className="text-base sm:text-lg font-black tabular-nums text-foreground">{formatMoney(allSales)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{t.admin.psReceived}</div>
                  <div className="text-base sm:text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">{formatMoney(sales)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{t.admin.psToCollect}</div>
                  <div className="text-base sm:text-lg font-black tabular-nums text-amber-700 dark:text-amber-400">{formatMoney(toCollect)}</div>
                </div>
              </div>
              <div className="mt-2.5 h-2 rounded-full bg-amber-200 dark:bg-amber-500/30 overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${receivedPct}%` }} />
              </div>
              <p className="m-0 mt-2 text-[11px] text-muted-foreground">{t.admin.psCollectionNote}</p>
            </div>
          )}
          <h3 className="text-sm font-bold text-foreground m-0">{t.admin.psHowTitle}</h3>
          <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.psHowSub}</p>

          <ol className="m-0 p-0 list-none space-y-3">
            {steps.map((step) => (
              <li key={step.key} className={step.tone === "subtotal" ? "pt-3 border-t border-dashed border-border" : undefined}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block w-4 text-sm font-bold text-muted-foreground">{step.sign}</span>
                    <span className="text-sm font-semibold text-foreground">{step.label}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground"> · {step.hint}</span>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                      isZero(step.amount)
                        ? "text-muted-foreground"
                        : step.tone === "cost"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                    }`}
                  >
                    {step.tone === "cost" && !isZero(step.amount) ? "−" : ""}
                    {formatMoney(Math.abs(step.amount))}
                  </span>
                </div>
                <div className="mt-1.5 ml-4 h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${BAR[step.tone]}`}
                    style={{ width: `${Math.min((Math.abs(step.amount) / scale) * 100, 100)}%` }}
                  />
                </div>
              </li>
            ))}

            <li className="pt-3 border-t-2 border-border">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <span className="inline-block w-4 text-sm font-bold text-muted-foreground">=</span>
                  <span className="text-base font-black text-foreground">{t.admin.psNet}</span>
                </div>
                <span
                  className={`text-lg font-black tabular-nums whitespace-nowrap ${
                    isLoss ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isLoss ? "−" : ""}
                  {formatMoney(Math.abs(netProfit))}
                </span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
