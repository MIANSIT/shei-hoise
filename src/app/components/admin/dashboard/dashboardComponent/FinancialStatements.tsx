"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/hook/useTranslation";
import { computeMargins, netMarginPct } from "@/lib/utils/profitMargins";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { AccrualStatementsData } from "@/lib/hook/useAccrualStatements";

interface FinancialStatementsProps {
  data: AccrualStatementsData;
  /** Stores with branches: one branch's statements. Null = the whole store. */
  branchId: string | null;
  periodLabel: string;
  /** Margin from vendor payments received in the period; added to net profit. */
  vendorProfit: number;
  formatMoney: (amount: number) => React.ReactNode;
  /** The owner can open the Investor money page to save the starting cash. */
  canSetUpCash?: boolean;
  /** Which statement(s) to show: both with tabs, or one on its own (the Balance Sheet page shows only the balance). */
  mode?: "both" | "pl" | "balance";
  /** With both statements, which one opens first. */
  initialTab?: "pl" | "balance";
}

type Tab = "pl" | "balance";

interface Row {
  key: string;
  label: string;
  how?: string;
  amount?: React.ReactNode;
  /** A heading that groups the lines under it. */
  heading?: boolean;
  /** A subtotal or total line. */
  strong?: boolean;
  /** The line the whole statement leads to. */
  result?: boolean;
  /** Indented under the line above. */
  sub?: boolean;
  chip?: string;
}

interface Segment {
  key: string;
  label: string;
  value: number;
  /** Tailwind background class for the bar and its legend dot. */
  color: string;
}

const isZero = (amount: number) => Math.abs(amount) < 0.005;

/** A single horizontal bar split into labelled parts, sized by their share of the total. */
function SegmentBar({ segments, pct }: { segments: Segment[]; pct: (part: number, whole: number) => string }) {
  const parts = segments.filter((s) => s.value > 0.005);
  const total = parts.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={parts.map((s) => `${s.label} ${pct(s.value, total)}`).join(", ")}>
        {parts.map((s) => (
          <div key={s.key} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {parts.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} aria-hidden="true" />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">{pct(s.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Profit & Loss for the picked period and the Balance as of today, in two
 * tabs. Each tab reads like a statement on the left (every line with what it
 * means) and shows the answer on the right: the headline figure and a bar of
 * where the money went or what it is made of. Revenue counts when the sale is
 * made, its cost counts with it, and money still owed shows on the Balance tab.
 */
export function FinancialStatements({ data, branchId, periodLabel, vendorProfit, formatMoney, canSetUpCash = false, mode = "both", initialTab = "pl" }: FinancialStatementsProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const [tabState, setTab] = useState<Tab>(initialTab);
  const tab: Tab = mode === "both" ? tabState : mode;
  const { pl, balance, vendorDue, cash } = data;

  const pct = (part: number, whole: number) => (whole > 0 ? `${n(((part / whole) * 100).toFixed(1))}%` : "—");
  const netProfit = pl.netProfit + vendorProfit;
  // Gross profit on the lines that have a TP: a product with no TP is not counted as free.
  // Profit on TP (TP 100, sold 125 = 25%) is how the shop prices; margin on selling price (20%) is the accounting view.
  const margins = computeMargins(pl);
  const fmtPct = (v: number | null) => (v == null ? "—" : `${n(v.toFixed(1))}%`);
  const grossChip = `${t.admin.fsProfitOnTp} ${fmtPct(margins.profitOnTp)} · ${t.admin.fsGrossMargin} ${fmtPct(margins.grossMargin)}`;
  const netMargin = netMarginPct(netProfit, pl.netRevenue, vendorProfit, pl.missingCostSales);
  const isLoss = netProfit < 0;

  const plRows: Row[] = [
    { key: "rev", label: t.admin.fsNetRevenue, how: t.admin.fsNetRevenueHow, amount: formatMoney(pl.netRevenue), strong: true },
    ...(!isZero(pl.uncollected)
      ? [
          { key: "collected", label: t.admin.fsCollected, how: t.admin.fsCollectedHow, amount: formatMoney(pl.collected), sub: true },
          { key: "uncollected", label: t.admin.fsUncollected, how: t.admin.fsUncollectedHow, amount: formatMoney(pl.uncollected), sub: true },
        ]
      : []),
    { key: "cogs", label: t.admin.fsCogs, how: t.admin.fsCogsHow, amount: formatMoney(pl.cogs) },
    {
      key: "gross",
      label: t.admin.fsGross,
      how: t.admin.fsGrossHow,
      amount: formatMoney(pl.grossProfit),
      strong: true,
      chip: grossChip,
    },
    { key: "opex", label: t.admin.fsOpex, how: t.admin.fsOpexHow, amount: formatMoney(pl.operatingExpenses) },
    ...(!isZero(pl.netDeliveryCost)
      ? [{ key: "delivery", label: t.admin.fsDelivery, how: pl.netDeliveryCost > 0 ? t.admin.fsDeliveryHow : t.admin.fsDeliveryGainHow, amount: formatMoney(Math.abs(pl.netDeliveryCost)) }]
      : []),
    ...(!isZero(vendorProfit) ? [{ key: "vendor", label: t.admin.fsVendorMargin, how: t.admin.fsVendorMarginHow, amount: formatMoney(vendorProfit) }] : []),
    ...(!isZero(pl.otherIncome ?? 0) ? [{ key: "other", label: t.admin.fsOtherIncome, how: t.admin.fsOtherIncomeHow, amount: formatMoney(Math.abs(pl.otherIncome)) }] : []),
    {
      key: "net",
      label: isLoss ? t.admin.fsNetLoss : t.admin.fsNet,
      how: t.admin.fsNetHow,
      amount: formatMoney(netProfit),
      strong: true,
      result: true,
      chip: `${t.admin.fsNetMargin} ${fmtPct(netMargin)}`,
    },
  ];
  // Costs show with a minus sign in front of their amount.
  const sign = (key: string): string => {
    if (key === "cogs" || key === "opex") return "−";
    if (key === "delivery") return pl.netDeliveryCost > 0 ? "−" : "+";
    if (key === "vendor") return "+";
    if (key === "other") return (pl.otherIncome ?? 0) >= 0 ? "+" : "−";
    return "";
  };

  const receivable = balance.customerDue + balance.codWithCourier + vendorDue;
  // With an opening balance, cash and equipment are part of the assets and loans of the liabilities.
  const cashTotal = cash?.total ?? 0;
  const fixedAssets = cash?.fixedAssets ?? 0;
  const loans = cash?.loans ?? 0;
  const advance = balance.supplierAdvance;
  // Money people put in that has not been spent or paid back: an asset next to business cash, but never part of sales.
  const investorAccount = cash?.investorAccount ?? 0;
  const totalAssets = cashTotal + investorAccount + fixedAssets + balance.inventoryAtCost + receivable + advance;
  const payable = balance.accountsPayable;
  const totalLiabilities = payable === null ? null : payable + loans;
  const netPosition = totalLiabilities === null ? null : totalAssets - totalLiabilities;
  const workingCapital = payable === null ? null : cashTotal + investorAccount + balance.inventoryAtCost + receivable + advance - payable;
  const methodLabel: Record<string, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    card: t.admin.moCard,
    bank_transfer: t.admin.moBankTransfer,
    online: t.admin.moOnline,
    other: t.admin.moOther,
  };

  const balanceRows: Row[] = [
    { key: "assets-head", label: t.admin.fsAssets, heading: true },
    ...(cash
      ? [
          { key: "cash", label: t.admin.fsCash, how: t.admin.fsCashHow, amount: formatMoney(cash.total) },
          ...cash.methods.map((m) => ({ key: `cash-${m.method}`, label: methodLabel[m.method] ?? m.method, amount: formatMoney(m.left), sub: true })),
        ]
      : []),
    ...(Math.abs(investorAccount) > 0.005
      ? [{ key: "investor-account", label: t.admin.fsInvestorAccount, how: t.admin.fsInvestorAccountHow, amount: formatMoney(investorAccount) }]
      : []),
    {
      key: "inventory",
      label: t.admin.fsInventory,
      how: t.admin.fsInventoryHow
        .replace("{units}", n(Math.round(balance.inventoryUnits).toLocaleString()))
        .replace("{sell}", n(Math.round(balance.inventoryAtSelling).toLocaleString())),
      amount: formatMoney(balance.inventoryAtCost),
    },
    { key: "receivable", label: t.admin.fsReceivable, amount: formatMoney(receivable) },
    { key: "r-customers", label: t.admin.fsRecvCustomers, how: t.admin.fsRecvCustomersHow, amount: formatMoney(balance.customerDue), sub: true },
    { key: "r-courier", label: t.admin.fsRecvCourier, how: t.admin.fsRecvCourierHow, amount: formatMoney(balance.codWithCourier), sub: true },
    { key: "r-vendors", label: t.admin.fsRecvVendors, how: t.admin.fsRecvVendorsHow, amount: formatMoney(vendorDue), sub: true },
    ...(advance > 0.005 ? [{ key: "advance", label: t.admin.fsSupplierAdvance, how: t.admin.fsSupplierAdvanceHow, amount: formatMoney(advance) }] : []),
    ...(fixedAssets > 0.005 ? [{ key: "fixed", label: t.admin.fsFixedAssets, how: t.admin.fsFixedAssetsHow, amount: formatMoney(fixedAssets) }] : []),
    { key: "assets", label: cash ? t.admin.fsTotalAssetsFull : t.admin.fsTotalAssets, amount: formatMoney(totalAssets), strong: true },
    { key: "liab-head", label: t.admin.fsLiabilities, heading: true },
    {
      key: "payable",
      label: t.admin.fsPayable,
      how: payable === null ? t.admin.fsNotShown : branchId ? `${t.admin.fsPayableHow}. ${balance.payableByBranch ? t.admin.fsPayableByBranch : t.admin.fsPayableStoreWide}` : t.admin.fsPayableHow,
      amount: payable === null ? "—" : formatMoney(payable),
    },
    ...(loans > 0.005 ? [{ key: "loans", label: t.admin.fsLoans, how: t.admin.fsLoansHow, amount: formatMoney(loans) }] : []),
    ...(cash && totalLiabilities !== null
      ? [{ key: "liabilities", label: t.admin.fsTotalLiabilities, amount: formatMoney(totalLiabilities), strong: true }]
      : []),
    ...(netPosition !== null
      ? [
          cash
            ? { key: "position", label: t.admin.fsEquity, how: t.admin.fsEquityHow, amount: formatMoney(netPosition), strong: true, result: true }
            : { key: "position", label: t.admin.fsNetPosition, how: t.admin.fsNetPositionHow, amount: formatMoney(netPosition), strong: true, result: true },
        ]
      : []),
    ...(cash && workingCapital !== null
      ? [{ key: "wc", label: t.admin.fsWorkingCapital, how: t.admin.fsWorkingCapitalHow, amount: formatMoney(workingCapital), strong: true }]
      : []),
    ...(!cash && canSetUpCash ? [{ key: "setup", label: t.admin.fsSetupCash, heading: false, amount: undefined }] : []),
  ];

  const rows = tab === "pl" ? plRows : balanceRows;

  // Where each taka of revenue went (costs first, what is kept last).
  const costSegments: Segment[] = [
    { key: "cogs", label: t.admin.fsCogs, value: pl.cogs, color: "bg-rose-400" },
    { key: "opex", label: t.admin.fsOpex, value: pl.operatingExpenses, color: "bg-amber-400" },
    { key: "delivery", label: t.admin.fsDelivery, value: Math.max(pl.netDeliveryCost, 0), color: "bg-sky-400" },
    { key: "kept", label: t.admin.fsSplitKept, value: Math.max(netProfit, 0), color: "bg-emerald-500" },
  ];
  const assetSegments: Segment[] = [
    { key: "cash", label: t.admin.fsCash, value: cashTotal, color: "bg-emerald-500" },
    { key: "investor", label: t.admin.fsInvestorAccount, value: Math.max(investorAccount, 0), color: "bg-violet-500" },
    { key: "fixed", label: t.admin.fsFixedAssets, value: fixedAssets, color: "bg-slate-400" },
    { key: "inventory", label: t.admin.fsInventory, value: balance.inventoryAtCost, color: "bg-teal-500" },
    { key: "customers", label: t.admin.fsRecvCustomers, value: balance.customerDue, color: "bg-sky-400" },
    { key: "courier", label: t.admin.fsRecvCourier, value: balance.codWithCourier, color: "bg-amber-400" },
    { key: "vendors", label: t.admin.fsRecvVendors, value: vendorDue, color: "bg-violet-400" },
    { key: "advance", label: t.admin.fsSupplierAdvance, value: advance, color: "bg-pink-400" },
  ];

  const collectedShare = pl.netRevenue > 0 ? Math.min((pl.collected / pl.netRevenue) * 100, 100) : 100;
  const isPl = tab === "pl";
  const accent = isPl ? "text-orange-600 dark:text-orange-400" : "text-teal-700 dark:text-teal-300";

  return (
    <section aria-labelledby="fs-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:shadow-none">
      <div className={`h-1 w-full ${isPl ? "bg-orange-500" : "bg-teal-600"}`} aria-hidden="true" />
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="fs-title" className="text-base font-bold text-foreground sm:text-lg">
              {t.admin.fsTitle}
            </h2>
            <p className={`mt-1 text-sm font-medium ${accent}`}>
              {isPl ? `${t.admin.fsPlQuestion}` : `${t.admin.fsBalQuestion}`}
              <span className="font-normal text-muted-foreground"> · {isPl ? periodLabel : t.admin.fsAsOfToday}</span>
            </p>
          </div>
          {mode === "both" && (
          <div role="tablist" aria-label={t.admin.fsTitle} className="inline-flex rounded-xl border border-border bg-muted p-0.5">
            {(["pl", "balance"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-[10px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                  tab === key
                    ? key === "pl"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-teal-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {key === "pl" ? t.admin.fsTabPl : t.admin.fsTabBalance}
              </button>
            ))}
          </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
          {/* The statement, line by line */}
          <div className="lg:col-span-3">
            <ul className="divide-y divide-border/70">
              {rows.map((row) => {
                if (row.heading) {
                  return (
                    <li key={row.key} className="pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-0">
                      {row.label}
                    </li>
                  );
                }
                if (row.key === "setup") {
                  return (
                    <li key={row.key} className="py-3">
                      <Link href="/dashboard/financial/investor-money" className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300">
                        {row.label}
                      </Link>
                    </li>
                  );
                }
                const marker = isPl ? sign(row.key) : "";
                return (
                  <li
                    key={row.key}
                    className={`flex items-start justify-between gap-4 py-2.5 ${row.sub ? "pl-5" : ""} ${
                      row.result ? `mt-1 rounded-xl px-3 ${isLoss && isPl ? "bg-rose-50 dark:bg-rose-500/10" : isPl ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-teal-50 dark:bg-teal-500/10"}` : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm ${row.strong ? "font-bold text-foreground" : row.sub ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        {row.label}
                        {row.chip && (
                          <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{row.chip}</span>
                        )}
                      </p>
                      {row.how && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{row.how}</p>}
                    </div>
                    <p className={`shrink-0 whitespace-nowrap text-sm tabular-nums ${row.strong ? "font-bold text-foreground" : row.sub ? "text-muted-foreground" : "text-foreground"}`}>
                      {marker && <span className="mr-1.5 text-muted-foreground">{marker}</span>}
                      {row.amount}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The answer */}
          <aside className="flex flex-col gap-4 lg:col-span-2">
            {isPl ? (
              <>
                <div
                  className={`rounded-2xl p-5 text-white ${
                    isLoss ? "bg-linear-to-br from-rose-500 to-red-600" : "bg-linear-to-br from-emerald-500 to-teal-600"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{isLoss ? t.admin.fsNetLoss : t.admin.fsNet}</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums sm:text-4xl">{formatMoney(netProfit)}</p>
                  <p className="mt-2 text-xs text-white/85">
                    {t.admin.fsNetMargin} {fmtPct(netMargin)} · {grossChip}
                  </p>
                </div>

                {pl.missingCostLines > 0 && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    {t.admin.fsMissingTp.replace("{n}", n(String(pl.missingCostLines))).split("{amount}")[0]}
                    {formatMoney(pl.missingCostSales)}
                    {t.admin.fsMissingTp.split("{amount}")[1]}{" "}
                    <Link href="/dashboard/products/no-tp" className="font-semibold underline">
                      {t.admin.npSeeList}
                    </Link>
                  </div>
                )}

                <div className="rounded-2xl border border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.fsSplitTitle}</p>
                  <SegmentBar segments={costSegments} pct={pct} />
                </div>

                {pl.netRevenue > 0 && (
                  <div className="rounded-2xl border border-border p-4">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.fsCollected}</p>
                      <p className="text-sm font-bold tabular-nums text-foreground">{n(collectedShare.toFixed(0))}%</p>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-500/30">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${collectedShare}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatMoney(pl.collected)} · {t.admin.fsUncollected} {formatMoney(pl.uncollected)}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t.admin.fsBasisNote}</p>
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-linear-to-br from-teal-600 to-cyan-700 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    {netPosition === null ? t.admin.fsTotalAssets : cash ? t.admin.fsEquity : t.admin.fsNetPosition}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums sm:text-4xl">{formatMoney(netPosition ?? totalAssets)}</p>
                  {netPosition !== null && (
                    <p className="mt-2 text-xs text-white/85">
                      {cash ? t.admin.fsTotalAssetsFull : t.admin.fsTotalAssets} {formatMoney(totalAssets)} − {cash ? t.admin.fsTotalLiabilities : t.admin.fsPayable} {formatMoney(totalLiabilities ?? 0)}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.fsAssetMixTitle}</p>
                  <SegmentBar segments={assetSegments} pct={pct} />
                </div>

                {balance.itemsWithoutCost > 0 && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    {t.admin.fsInventoryNoCost.replace("{count}", n(balance.itemsWithoutCost))}
                  </p>
                )}
                {cash ? null : <p className="text-xs text-muted-foreground">{t.admin.fsCashLater}</p>}
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
