"use client";

import React from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  HandCoins,
  Landmark,
  Receipt,
  Scale,
} from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { AccountsOverview } from "@/lib/queries/dashboard/getAccountsOverview";
import type { MoneyMethodKey } from "@/lib/queries/financial/getMoneyOverview";

/** The same period's trading result, so the two halves of the books sit side by side. */
export interface AccountsTrading {
  sales: number;
  grossProfit: number;
  netProfit: number;
}

interface AccountsViewProps {
  data: AccountsOverview;
  loading: boolean;
  periodLabel: string;
  trading: AccountsTrading;
  formatMoney: (amount: number) => React.ReactNode;
  /** Switches the dashboard to the Sales view. */
  onOpenSales: () => void;
}

const isZero = (amount: number) => Math.abs(amount) < 0.005;

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`rounded-2xl bg-card border border-border shadow-sm dark:shadow-none ${className}`}
  >
    {children}
  </div>
);

/** One money line inside a list: label, optional hint, amount. */
const Line: React.FC<{
  label: string;
  hint?: string;
  amount: React.ReactNode;
  tone?: "in" | "out" | "plain";
  strong?: boolean;
}> = ({ label, hint, amount, tone = "plain", strong = false }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <div className="min-w-0">
      <span className={`text-sm ${strong ? "font-bold" : "font-medium"} text-foreground`}>
        {label}
      </span>
      {hint && <span className="hidden sm:inline text-xs text-muted-foreground"> · {hint}</span>}
    </div>
    <span
      className={`whitespace-nowrap tabular-nums ${strong ? "text-base font-black" : "text-sm font-bold"} ${
        tone === "in"
          ? "text-emerald-600 dark:text-emerald-400"
          : tone === "out"
            ? "text-rose-600 dark:text-rose-400"
            : "text-foreground"
      }`}
    >
      {tone === "out" ? "−" : ""}
      {amount}
    </span>
  </div>
);

/**
 * The Accounts half of the dashboard: what the business holds, what is owed
 * either way, and the cash that moved over the period. Buying stock lives
 * here — it is cash turning into stock, not a cost of the period's sales
 * (see accounting.ts), which is why it never appears in the Sales view's
 * profit steps.
 */
export function AccountsView({
  data,
  loading,
  periodLabel,
  trading,
  formatMoney,
  onOpenSales,
}: AccountsViewProps) {
  const t = useTranslation();
  const n = useLocalNum();

  const methodLabel: Record<MoneyMethodKey, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    card: t.admin.moCard,
    bank_transfer: t.admin.moBankTransfer,
    online: t.admin.moOnline,
    cod: t.admin.moCod,
    other: t.admin.moOther,
  };

  if (loading) {
    return (
      <Card className="p-10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </Card>
    );
  }

  const { cashIn, cashOut, owedToYou, youOwe, stock } = data;
  const periodDifference = cashIn.total - cashOut.total;
  const worthIsNegative = data.businessWorth < 0;
  const nothingMoved = isZero(cashIn.total) && isZero(cashOut.total);

  const parts: { key: string; label: string; hint: string; amount: number; icon: React.ReactNode; sign: "+" | "−" }[] = [
    { key: "cash", label: t.admin.acCash, hint: t.admin.acCashHint, amount: data.cashLeft, icon: <Banknote size={15} aria-hidden="true" />, sign: "+" },
    { key: "stock", label: t.admin.acStock, hint: t.admin.acStockHint, amount: stock.value, icon: <Boxes size={15} aria-hidden="true" />, sign: "+" },
    { key: "owed", label: t.admin.acOwedToYou, hint: t.admin.acOwedToYouHint, amount: owedToYou.total, icon: <HandCoins size={15} aria-hidden="true" />, sign: "+" },
    ...(youOwe.supplierVisible
      ? [
          {
            key: "owe",
            label: t.admin.acYouOwe,
            hint: t.admin.acYouOweHint,
            amount: youOwe.total,
            icon: <Landmark size={15} aria-hidden="true" />,
            sign: "−" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* What the business is worth, and the four parts that make it up. */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          <div
            className={`lg:col-span-2 p-5 sm:p-6 text-white flex flex-col justify-between gap-4 ${
              worthIsNegative
                ? "bg-linear-to-br from-rose-500 to-red-600"
                : "bg-linear-to-br from-indigo-500 to-violet-600"
            }`}
          >
            <div className="flex items-center gap-2 text-white/85 text-xs font-semibold uppercase tracking-wider">
              <Scale size={16} aria-hidden="true" />
              {t.admin.acTitle}
            </div>
            <div>
              <div className="text-sm font-medium text-white/90">{t.admin.acWorth}</div>
              <div className="text-3xl sm:text-4xl font-black tabular-nums leading-tight mt-1">
                {worthIsNegative ? "−" : ""}
                {formatMoney(Math.abs(data.businessWorth))}
              </div>
              <div className="text-xs text-white/85 mt-1">{t.admin.acWorthHint}</div>
            </div>
            <p className="m-0 text-[11px] leading-relaxed text-white/80">{t.admin.acLifetimeNote}</p>
          </div>

          <div className="lg:col-span-3 p-4 sm:p-6">
            <ul className="m-0 p-0 list-none divide-y divide-border">
              {parts.map((part) => (
                <li key={part.key} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex w-4 text-sm font-bold text-muted-foreground">
                        {part.sign}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <span className="text-muted-foreground">{part.icon}</span>
                        {part.label}
                      </span>
                      <span className="hidden sm:inline text-xs text-muted-foreground"> · {part.hint}</span>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                        part.sign === "−" ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                      }`}
                    >
                      {part.sign === "−" && !isZero(part.amount) ? "−" : ""}
                      {formatMoney(Math.abs(part.amount))}
                    </span>
                  </div>
                  {part.key === "owed" && owedToYou.total > 0.005 && (
                    <p className="m-0 mt-1 ml-4 text-[11px] text-muted-foreground">
                      {t.admin.acCustomerDue} {formatMoney(owedToYou.customerDue)} ·{" "}
                      {t.admin.acCodWithCourier} {formatMoney(owedToYou.codWithCourier)} ·{" "}
                      {t.admin.acVendorDue} {formatMoney(owedToYou.vendorDue)}
                    </p>
                  )}
                  {part.key === "stock" && (
                    <p className="m-0 mt-1 ml-4 text-[11px] text-muted-foreground">
                      {t.admin.acStockUnits.replace("{n}", n(stock.units))}
                      {stock.unitsMissingCost > 0 &&
                        ` · ${t.admin.acStockMissingCost.replace("{n}", n(stock.unitsMissingCost))}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Cash in and out over the period shown. */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-foreground m-0">
            {t.admin.acMoneyMoved} · {periodLabel}
          </h3>
          <p className="text-xs text-muted-foreground m-0 mt-0.5">{t.admin.acMoneyMovedSub}</p>
        </div>

        {nothingMoved ? (
          <p className="text-sm text-muted-foreground m-0 py-6 text-center">{t.admin.acNothingYet}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <ArrowUpRight size={14} aria-hidden="true" />
                  {t.admin.acCashIn}
                </div>
                <Line label={t.admin.acFromOrders} amount={formatMoney(cashIn.orders)} tone="in" />
                <Line label={t.admin.acFromDues} amount={formatMoney(cashIn.dueCollections)} tone="in" />
                {cashIn.vendorPayments > 0.005 && (
                  <Line label={t.admin.acFromVendors} amount={formatMoney(cashIn.vendorPayments)} tone="in" />
                )}
                <div className="mt-1.5 pt-2 border-t border-emerald-200 dark:border-emerald-500/30">
                  <Line label={t.admin.acCashIn} amount={formatMoney(cashIn.total)} tone="in" strong />
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  <ArrowDownRight size={14} aria-hidden="true" />
                  {t.admin.acCashOut}
                </div>
                <Line
                  label={t.admin.acStockBuying}
                  hint={t.admin.acStockBuyingHint}
                  amount={formatMoney(cashOut.stockBuying.total)}
                  tone="out"
                />
                <Line
                  label={t.admin.acRunningCosts}
                  hint={t.admin.acRunningCostsHint}
                  amount={formatMoney(cashOut.operatingExpenses)}
                  tone="out"
                />
                {cashOut.refunds > 0.005 && (
                  <Line label={t.admin.acRefunds} amount={formatMoney(cashOut.refunds)} tone="out" />
                )}
                {cashOut.ownerDrawExpenses > 0.005 && (
                  <Line label={t.admin.acOwnerDraw} amount={formatMoney(cashOut.ownerDrawExpenses)} tone="out" />
                )}
                {cashOut.ownerWithdrawals > 0.005 && (
                  <Line label={t.admin.acOwnerTook} amount={formatMoney(cashOut.ownerWithdrawals)} tone="out" />
                )}
                <div className="mt-1.5 pt-2 border-t border-rose-200 dark:border-rose-500/30">
                  <Line label={t.admin.acCashOut} amount={formatMoney(cashOut.total)} tone="out" strong />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <span className="text-sm font-bold text-foreground">{t.admin.acDifference}</span>
              <span
                className={`text-base font-black tabular-nums ${
                  periodDifference < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {periodDifference < 0 ? "−" : ""}
                {formatMoney(Math.abs(periodDifference))}
              </span>
            </div>

            {data.outsideSpent > 0.005 && (
              <p className="m-0 mt-2 text-[11px] text-muted-foreground">
                {t.admin.acOutsideSpent}: {formatMoney(data.outsideSpent)} · {t.admin.acOutsideSpentHint}
              </p>
            )}
          </>
        )}

        <p className="m-0 mt-3 rounded-xl bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {t.admin.acStockNote}
        </p>
      </Card>

      {/* Where the money is sitting now. */}
      {data.byMethod.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-sm font-bold text-foreground m-0">{t.admin.acByMethodTitle}</h3>
          <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.acByMethodSub}</p>
          <ul className="m-0 p-0 list-none divide-y divide-border">
            {data.byMethod.map((row) => (
              <li
                key={row.method}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <span className="text-sm font-semibold text-foreground">{methodLabel[row.method]}</span>
                <span className="flex flex-wrap items-baseline gap-x-4 text-xs tabular-nums text-muted-foreground">
                  <span>
                    {t.admin.acMethodIn}{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(row.total + row.fromVendors)}
                    </span>
                  </span>
                  <span>
                    {t.admin.acMethodOut}{" "}
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {formatMoney(row.spent + row.refunded + row.withdrawn)}
                    </span>
                  </span>
                  <span className="text-sm">
                    {t.admin.acMethodLeft}{" "}
                    <span className="font-black text-foreground">{formatMoney(row.left)}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* The selling side of the same period, so both halves reconcile. */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground m-0">
              {t.admin.acTradingTitle} · {periodLabel}
            </h3>
            <p className="text-xs text-muted-foreground m-0 mt-0.5">{t.admin.acTradingSub}</p>
          </div>
          <button
            type="button"
            onClick={onOpenSales}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            {t.admin.acOpenSales}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {[
            { key: "sales", label: t.admin.acTradingSales, amount: trading.sales, icon: <Receipt size={14} aria-hidden="true" /> },
            { key: "gross", label: t.admin.acTradingGross, amount: trading.grossProfit, icon: <ArrowUpRight size={14} aria-hidden="true" /> },
            { key: "net", label: t.admin.acTradingNet, amount: trading.netProfit, icon: <Scale size={14} aria-hidden="true" /> },
          ].map((tile) => (
            <div key={tile.key} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {tile.icon}
                {tile.label}
              </div>
              <div
                className={`mt-0.5 break-words text-lg font-black tabular-nums ${
                  tile.amount < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                }`}
              >
                {tile.amount < 0 ? "−" : ""}
                {formatMoney(Math.abs(tile.amount))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
