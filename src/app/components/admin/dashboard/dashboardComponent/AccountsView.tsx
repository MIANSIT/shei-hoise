"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { AccrualStatementsData } from "@/lib/hook/useAccrualStatements";
import { getMoneyOverview, type MoneyOverview } from "@/lib/queries/financial/getMoneyOverview";
import { SectionHeader, Card } from "./OrderFlowBlocks";

interface AccountsViewProps {
  data: AccrualStatementsData | null;
  ready: boolean;
  storeId: string;
  /** Stores with branches: one branch. Null = the whole store. */
  branchId: string | null;
  withBranches: boolean;
  isOwner: boolean;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  formatMoney: (amount: number) => React.ReactNode;
  /** Plans with the Balance Sheet page get a link to it. */
  balanceSheetAllowed: boolean;
  /** The same period from the selling side, so the two tabs can be read together. */
  trading: { sales: number; grossProfit: number; netProfit: number };
  onOpenSales: () => void;
}

interface LineProps {
  label: string;
  hint?: string;
  detail?: string;
  amount: React.ReactNode;
  sign?: "+" | "−";
  tone?: string;
}

function Line({ label, hint, detail, amount, sign, tone = "text-foreground" }: LineProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {sign && <span className="mr-2 text-muted-foreground" aria-hidden="true">{sign}</span>}
          {label}
          {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
        </p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <p className={`shrink-0 text-sm font-extrabold tabular-nums ${tone}`}>{amount}</p>
    </div>
  );
}

/**
 * The Accounts tab of the dashboard: where the business stands today (what it owns and owes), where the
 * period's money came from and went, and where it sits now. It uses the same figures as the Balance Sheet
 * page, so every store can read its real position without that page.
 */
export function AccountsView({
  data,
  ready,
  storeId,
  branchId,
  withBranches,
  isOwner,
  periodStart,
  periodEnd,
  periodLabel,
  formatMoney,
  balanceSheetAllowed,
  trading,
  onOpenSales,
}: AccountsViewProps) {
  const t = useTranslation();
  const [moved, setMoved] = useState<MoneyOverview | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    getMoneyOverview(storeId, periodStart, periodEnd, branchId, withBranches, isOwner)
      .then((overview) => {
        if (!cancelled) setMoved(overview);
      })
      .catch(() => {
        if (!cancelled) setMoved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, periodStart, periodEnd, branchId, withBranches, isOwner]);

  if (!data) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {ready ? t.admin.acUnavailable : t.admin.acLoading}
      </p>
    );
  }

  const { balance, vendorDue, cash } = data;
  const owedToYou = balance.customerDue + balance.codWithCourier + vendorDue;
  const cashTotal = cash?.total ?? 0;
  const fixedAssets = cash?.fixedAssets ?? 0;
  const loans = cash?.loans ?? 0;
  const advance = balance.supplierAdvance;
  const payable = balance.accountsPayable;
  // Money people put in is held apart from business cash: it adds to what the business holds, never to its sales.
  const investorAccount = cash?.investorAccount ?? 0;
  const totalAssets = cashTotal + investorAccount + fixedAssets + balance.inventoryAtCost + owedToYou + advance;
  const youOwe = payable === null ? null : payable + loans;
  // Without an opening balance the worth leaves out cash, and the card says so.
  const worth = youOwe === null ? null : totalAssets - youOwe;

  const methodLabel: Record<string, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    bank_transfer: t.admin.moBankTransfer,
  };

  const cameIn = moved ? moved.receivedTotal + moved.vendorReceivedTotal : 0;
  const wentOut = moved ? moved.spentTotal + moved.refundedTotal + moved.withdrawnTotal : 0;
  const left = cameIn - wentOut;
  const orderPayments = moved ? moved.sources.ordersThisPeriod + moved.sources.ordersEarlier : 0;
  const gainTone = (v: number) => (v < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-300");

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* WHERE THE BUSINESS STANDS */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:shadow-none lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-5 text-white sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/80">{t.admin.acStandsTitle}</p>
          <p className="mt-6 text-sm text-white/85">{cash ? t.admin.acWorth : t.admin.acWorthNoCash}</p>
          <p className="mt-1 text-3xl font-black tabular-nums sm:text-4xl">{worth === null ? "—" : formatMoney(worth)}</p>
          <p className="mt-2 text-sm text-white/85">{cash ? t.admin.acWorthHow : t.admin.acWorthHowNoCash}</p>
          {!cash && isOwner && <p className="mt-4 rounded-lg bg-white/15 px-3 py-2 text-xs">{t.admin.acSetCash}</p>}
          <p className="mt-6 text-xs text-white/75">{t.admin.acWholeHistory}</p>
        </div>
        <div className="p-4 sm:p-6">
          {cash && <Line sign="+" label={t.admin.acBusinessCash} hint={t.admin.acCashHint} amount={formatMoney(cash.total)} />}
          {cash && investorAccount > 0.005 && <Line sign="+" label={t.admin.acInvestor} hint={t.admin.acInvestorHint} amount={formatMoney(investorAccount)} />}
          <Line
            sign="+"
            label={t.admin.acStock}
            hint={t.admin.acStockHint}
            detail={t.admin.acStockUnits.replace("{units}", Math.round(balance.inventoryUnits).toLocaleString())}
            amount={formatMoney(balance.inventoryAtCost)}
          />
          <Line
            sign="+"
            label={t.admin.mpOwedToYou}
            hint={t.admin.acOwedHint}
            detail={t.admin.acOwedParts
              .replace("{customers}", Math.round(balance.customerDue).toLocaleString())
              .replace("{courier}", Math.round(balance.codWithCourier).toLocaleString())
              .replace("{vendors}", Math.round(vendorDue).toLocaleString())}
            amount={formatMoney(owedToYou)}
          />
          {advance > 0.005 && <Line sign="+" label={t.admin.fsSupplierAdvance} amount={formatMoney(advance)} />}
          {fixedAssets > 0.005 && <Line sign="+" label={t.admin.fsFixedAssets} amount={formatMoney(fixedAssets)} />}
          <Line
            sign="−"
            label={t.admin.mpYouOwe}
            hint={t.admin.acOweHint}
            detail={
              payable !== null && loans > 0.005
                ? t.admin.acOweParts
                    .replace("{suppliers}", Math.round(payable).toLocaleString())
                    .replace("{loans}", Math.round(loans).toLocaleString())
                : undefined
            }
            amount={youOwe === null ? "—" : formatMoney(youOwe)}
            tone="text-rose-600 dark:text-rose-400"
          />
          {balanceSheetAllowed && (
            <Link
              href="/dashboard/balance-sheet"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
            >
              {t.admin.mpOpen}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {/* MONEY MOVED IN THE PERIOD */}
      {moved && (
        <div>
          <SectionHeader title={`${t.admin.acMoved} · ${periodLabel}`} sub={t.admin.acMovedSub} accentClass="bg-emerald-500" />
          <Card className="p-3 sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">{t.admin.acCameIn}</p>
                <Line label={t.admin.acOrderPay} amount={formatMoney(orderPayments)} tone="text-emerald-700 dark:text-emerald-300" />
                <Line label={t.admin.acDueColl} amount={formatMoney(moved.sources.dueCollections)} tone="text-emerald-700 dark:text-emerald-300" />
                {moved.vendorReceivedTotal > 0.005 && (
                  <Line label={t.admin.acVendorPay} amount={formatMoney(moved.vendorReceivedTotal)} tone="text-emerald-700 dark:text-emerald-300" />
                )}
                <Line label={t.admin.acCameInTotal} amount={formatMoney(cameIn)} tone="text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-rose-700 dark:text-rose-300">{t.admin.acWentOut}</p>
                <Line label={t.admin.acStockBuying} hint={t.admin.acStockBuyingHint} amount={formatMoney(moved.spentBreakdown.suppliers)} tone="text-rose-600 dark:text-rose-400" />
                <Line label={t.admin.acRunning} hint={t.admin.acRunningHint} amount={formatMoney(moved.spentBreakdown.expenses)} tone="text-rose-600 dark:text-rose-400" />
                <Line label={t.admin.acRefunds} amount={formatMoney(moved.refundedTotal)} tone="text-rose-600 dark:text-rose-400" />
                {moved.withdrawnTotal > 0.005 && (
                  <Line label={t.admin.acWithdrawn} amount={formatMoney(moved.withdrawnTotal)} tone="text-rose-600 dark:text-rose-400" />
                )}
                <Line label={t.admin.acWentOutTotal} amount={formatMoney(wentOut)} tone="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-sm font-bold text-foreground">{t.admin.acLeft}</p>
              <p className={`text-lg font-black tabular-nums ${gainTone(left)}`}>{formatMoney(left)}</p>
            </div>
            <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{t.admin.acBuyingNote}</p>
          </Card>
        </div>
      )}

      {/* WHERE THE MONEY SITS */}
      {cash && (
        <div>
          <SectionHeader title={t.admin.acSits} sub={t.admin.acSitsSub} accentClass="bg-sky-500" />
          <Card className="p-3 sm:p-5">
            {cash.methods.map((m) => (
              <Line
                key={m.method}
                label={methodLabel[m.method] ?? m.method}
                detail={t.admin.acSitsDetail
                  .replace("{opening}", Math.round(m.opening).toLocaleString())
                  .replace("{moved}", Math.round(m.moved).toLocaleString())}
                amount={formatMoney(m.left)}
                tone={m.left < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}
              />
            ))}
          </Card>
        </div>
      )}

      {/* THE SAME PERIOD FROM THE SELLING SIDE */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionHeader title={`${t.admin.acTrading} · ${periodLabel}`} sub={t.admin.acTradingSub} accentClass="bg-violet-500" />
          <button
            type="button"
            onClick={onOpenSales}
            className="mb-2 inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            {t.admin.acOpenSales}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { key: "sales", label: t.admin.acSales, value: trading.sales, tone: "text-foreground" },
            { key: "gross", label: t.admin.acGross, value: trading.grossProfit, tone: gainTone(trading.grossProfit) },
            { key: "net", label: t.admin.acNet, value: trading.netProfit, tone: gainTone(trading.netProfit) },
          ].map((c) => (
            <div key={c.key} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className={`mt-1 text-xl font-extrabold tabular-nums ${c.tone}`}>{formatMoney(c.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
