"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/hook/useTranslation";
import StatCard from "./StatCard";
import InventoryAlertCard from "./InventoryAlertCard";
import OrderAmountCard from "./OrderAmountCard";
import SalesTrendChart from "./SalesTrendChart";
import TopProducts from "./TopProducts";
import CustomerSnapshot from "./CustomerSnapshot";
import AlertsSection from "./AlertsSection";
import LockedSection from "@/app/components/admin/common/LockedSection";
import { SectionHeader, Card, OrderFlowBlocks } from "./OrderFlowBlocks";
import { ProfitStory, type BranchProfit, type ProfitStoryFigures } from "./ProfitStory";

// Imported rather than redeclared — a local copy silently drifted out of sync
// with the canonical type when "all" was added.
import type { TimePeriod } from "@/lib/hook/useDashboardMetrics";

import { formatDate } from "@/lib/utils/formatDate";
interface MainDashboardProps {
  stats: {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    change: React.ReactNode;
    changeType: "positive" | "negative" | "neutral";
    description?: string;
  }[];
  expenseStats: {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    change: React.ReactNode;
    changeType: "positive" | "negative" | "neutral";
    description?: string;
  }[];
  expenseCategoryBreakdown?: {
    name: string;
    amount: number;
    percentage: number;
  }[];
  orderStatusCards: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    textColor: string;
  }[];
  orderAmounts: {
    title: string;
    amount: number;
    color?: string;
    status?: "paid" | "pending" | "refunded";
  }[];
  inventoryAlerts: {
    title: string;
    value: string | React.ReactNode;
    icon: React.ReactNode;
    color: string;
    actionText: string;
  }[];
  salesTrend: { date: string; sales: number }[];
  topProducts: { name: string; revenue: number; quantity: number }[];
  customerStats: {
    title: string;
    value: string;
    icon: React.ReactNode;
    subValue?: string | React.ReactNode;
  }[];
  alerts: {
    type: "stock" | "order" | "payment" | "expense";
    message: string;
    count: number;
  }[];
  /** Only rendered when hasActivity — a store that's never dispatched stock to a vendor gets no vendor block at all rather than a card full of zeros. */
  vendorPayments: {
    received: number;
    totalDue: number;
    hasActivity: boolean;
  };
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  /** Gates the sales trend chart, top products and customer insights widgets — the deeper analytics on the dashboard home, distinct from the dedicated Sales Report page (advanced_reports). */
  analyticsAllowed: boolean;
  /** Stores with branches: which branch these figures are for (shown under the title). */
  branchLabel?: string;
  /** Stores with branches: the branch comparison, shown above the snapshot on "All branches". */
  branchComparison?: React.ReactNode;
  /** Profit & Loss on one accounting basis (and the money position strip), shown above the snapshot. */
  statements?: React.ReactNode;
  /** Money alerts (bills due, old dues, courier cash, negative cash), shown under the stock and order alerts. */
  moneyAlerts?: React.ReactNode;
  /** The statements card already tells the profit story, so the older snapshot above the cards is left out. */
  hideProfitHero?: boolean;
  /** The P&L as a step-by-step story (sales → costs → net). Replaces the three-cell bar when given. */
  profitStory?: {
    figures: ProfitStoryFigures;
    formatMoney: (amount: number) => React.ReactNode;
    branchProfits?: BranchProfit[];
    onOpenBranch?: (branchId: string) => void;
  };
  /** The Accounts tab. Given a function that switches back to the Sales tab. When omitted there are no tabs. */
  accountsView?: (openSales: () => void) => React.ReactNode;
}

type DashboardTab = "sales" | "accounts";

// ─── Period Selector ──────────────────────────────────────────────────────────
const PeriodSelector: React.FC<{
  value: TimePeriod;
  onChange: (v: TimePeriod) => void;
}> = ({ value, onChange }) => {
  const t = useTranslation();
  return (
  <div
    className="inline-flex items-center rounded-xl p-1 gap-0.5
    bg-muted
    border border-border"
  >
    {(
      [
        ["weekly", t.admin.period7D],
        ["monthly", t.admin.period30D],
        ["yearly", t.admin.period1Y],
        ["all", t.admin.periodAll],
      ] as [TimePeriod, string][]
    ).map(([key, label]) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold tracking-wider transition-all duration-150
          ${
            value === key
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
      >
        {label}
      </button>
    ))}
  </div>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div className="h-px bg-linear-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
);

// ─── P&L Hero Bar ─────────────────────────────────────────────────────────────
const PLHeroBar: React.FC<{
  revenue: React.ReactNode;
  expenses: React.ReactNode;
  netProfit: React.ReactNode;
  netChangeType: "positive" | "negative" | "neutral";
  periodLabel: string;
}> = ({ revenue, expenses, netProfit, netChangeType, periodLabel }) => {
  const t = useTranslation();
  const netStyle =
    netChangeType === "positive"
      ? {
          value: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-500/10",
          glyph: "●",
        }
      : netChangeType === "negative"
        ? {
            value: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-500/10",
            glyph: "◆",
          }
        : {
            value: "text-muted-foreground",
            bg: "bg-background",
            glyph: "—",
          };

  const PLCell = ({
    bg,
    textCls,
    glyph,
    label,
    val,
    borderRight = false,
  }: {
    bg: string;
    textCls: string;
    glyph: string;
    label: string;
    val: React.ReactNode;
    borderRight?: boolean;
  }) => (
    <div
      className={`flex flex-col items-center justify-center py-4 sm:py-6 px-2 sm:px-4 gap-0.5 sm:gap-1
      ${bg} ${borderRight ? "border-r border-border" : ""}`}
    >
      <span
        className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest sm:tracking-[0.2em] opacity-80 ${textCls}`}
      >
        {glyph} {label}
      </span>
      {/* Value shrinks on very small screens */}
      <span
        className={`text-sm sm:text-xl md:text-2xl font-black tabular-nums leading-none ${textCls}`}
      >
        {val}
      </span>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-widest mt-0.5 text-muted-foreground">
        {periodLabel}
      </span>
    </div>
  );

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-4 sm:mb-6
      bg-card
      border border-border
      shadow-sm dark:shadow-none"
    >
      <div className="grid grid-cols-3">
        <PLCell
          bg="bg-emerald-50 dark:bg-emerald-500/10"
          textCls="text-emerald-600 dark:text-emerald-300"
          glyph="▲"
          label={t.admin.revenue}
          val={revenue}
          borderRight
        />
        <PLCell
          bg="bg-rose-50 dark:bg-rose-500/10"
          textCls="text-rose-600 dark:text-rose-300"
          glyph="▼"
          label={t.admin.expenses}
          val={expenses}
          borderRight
        />
        <PLCell
          bg={netStyle.bg}
          textCls={netStyle.value}
          glyph={netStyle.glyph}
          label={t.admin.netProfit}
          val={netProfit}
        />
      </div>
    </div>
  );
};

// ─── Expense Category Chips ───────────────────────────────────────────────────
const chipStyles = [
  {
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-500/30",
    bg: "bg-rose-50 dark:bg-rose-500/10",
  },
  {
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/30",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-500/30",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-500/30",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
const MainDashboard: React.FC<MainDashboardProps> = ({
  stats,
  expenseStats,
  expenseCategoryBreakdown,
  orderStatusCards,
  orderAmounts,
  inventoryAlerts,
  salesTrend,
  topProducts,
  customerStats,
  alerts,
  vendorPayments,
  timePeriod,
  onTimePeriodChange,
  analyticsAllowed,
  branchLabel,
  branchComparison,
  statements,
  moneyAlerts,
  hideProfitHero = false,
  profitStory,
  accountsView,
}) => {
  const t = useTranslation();
  const [tab, setTab] = useState<DashboardTab>("sales");
  const periodLabel =
    timePeriod === "weekly"
      ? t.admin.periodLast7
      : timePeriod === "monthly"
        ? t.admin.periodLast30
        : timePeriod === "yearly"
          ? t.admin.periodLast365
          : t.admin.periodAllTime;

  const revenueValue = stats[0]?.value ?? "—";
  const expensesValue = expenseStats[0]?.value ?? "—";
  const netProfitValue = expenseStats[1]?.value ?? "—";
  const netChangeType = expenseStats[1]?.changeType ?? "neutral";

  const dateStr = formatDate(new Date());


  return (
    <div
      className="min-h-screen pb-16 sm:pb-20
      bg-background
      text-foreground"
    >
      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl
        bg-gray-50/90 dark:bg-gray-950/90
        border-b border-border"
      >
        <div
          className="max-w-400 mx-auto px-3 sm:px-6 h-12 sm:h-14
          flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
              bg-indigo-500 shadow-md shadow-indigo-500/30"
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p
                className="text-xs sm:text-sm font-bold leading-none truncate
                text-foreground"
              >
                {t.admin.businessOverview}
              </p>
              <p
                className="text-[9px] sm:text-[10px] mt-0.5 hidden sm:block
                text-black dark:text-white"
              >
                {dateStr}
              </p>
            </div>
            {branchLabel && (
              <span className="shrink-0 max-w-32 sm:max-w-none truncate rounded-full bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/30 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-teal-700 dark:text-teal-300">
                {branchLabel}
              </span>
            )}
          </div>
          <PeriodSelector value={timePeriod} onChange={onTimePeriodChange} />
        </div>
        {accountsView && (
          <div className="max-w-400 mx-auto px-3 sm:px-6 pb-2 flex gap-2" role="tablist" aria-label={t.admin.businessOverview}>
            {(
              [
                ["sales", t.admin.acTabSales, t.admin.acTabSalesSub],
                ["accounts", t.admin.acTabAccounts, t.admin.acTabAccountsSub],
              ] as [DashboardTab, string, string][]
            ).map(([key, label, sub]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-xl px-3 sm:px-4 py-1.5 text-left transition-colors ${
                  tab === key
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <span className="block text-xs sm:text-sm font-bold leading-tight">{label}</span>
                <span className={`block text-[10px] leading-tight ${tab === key ? "text-white/80" : "text-muted-foreground"}`}>{sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Page content ── */}
      <div className="max-w-400 mx-auto px-3 sm:px-6 pt-4 sm:pt-7 space-y-5 sm:space-y-8">
        {/* ALERTS: stock and order alerts belong to selling; the Accounts tab keeps only the money alerts */}
        {tab === "sales" && alerts.length > 0 && (
          <div
            className="rounded-2xl p-3 sm:p-4
            bg-amber-50 dark:bg-amber-500/10
            border border-amber-200 dark:border-amber-500/25"
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span
                className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em]
                text-amber-600 dark:text-amber-400"
              >
                {alerts.length} {alerts.length > 1 ? t.admin.alertPlural : t.admin.alertSingle} · {t.admin.actionRequired}
              </span>
            </div>
            <AlertsSection alerts={alerts} />
          </div>
        )}

        {moneyAlerts}

        {tab === "accounts" ? (
          accountsView?.(() => setTab("sales"))
        ) : (
        <>
        {branchComparison}

        {statements}

        {/* P&L HERO */}
        <div>
          {!hideProfitHero && (
          <>
          <SectionHeader
            title={t.admin.profitLossSnapshot}
            sub={profitStory ? t.admin.psSectionSub : `${periodLabel} · ${t.admin.revenueVsExpenses}`}
            accentClass="bg-emerald-500"
          />
          {profitStory ? (
            <ProfitStory
              figures={profitStory.figures}
              periodLabel={periodLabel}
              formatMoney={profitStory.formatMoney}
              branchProfits={profitStory.branchProfits}
              onOpenBranch={profitStory.onOpenBranch}
            />
          ) : (
            <PLHeroBar
              revenue={revenueValue}
              expenses={expensesValue}
              netProfit={netProfitValue}
              netChangeType={netChangeType}
              periodLabel={periodLabel}
            />
          )}
          </>
          )}
          {expenseCategoryBreakdown && expenseCategoryBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              <span
                className="text-[9px] sm:text-[10px] uppercase tracking-wider self-center
                text-muted-foreground"
              >
                {t.admin.expenseSplit}
              </span>
              {expenseCategoryBreakdown.map((cat, i) => {
                const c = chipStyles[i % chipStyles.length];
                return (
                  <span
                    key={i}
                    className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1
                      rounded-full border ${c.text} ${c.border} ${c.bg}`}
                  >
                    {cat.name} {cat.percentage}%
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* REVENUE KPIs — 2 col mobile, 4 col xl */}
        <div>
          <SectionHeader
            title={t.admin.revenueOrders}
            sub={`${periodLabel} ${t.admin.periodPerformance}`}
            accentClass="bg-indigo-500"
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>
        </div>

        {/* FINANCIAL KPIs — 2 col mobile, 4 col xl */}
        <div>
          <SectionHeader
            title={t.admin.financialHealth}
            sub={t.admin.expenseNetBurnTop}
            accentClass="bg-rose-500"
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            {expenseStats.map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>
        </div>

        <Divider />

        {/* SALES TREND */}
        <div>
          <SectionHeader
            title={t.admin.salesTrendTitle}
            sub={t.admin.dailyPaidRevenue}
            accentClass="bg-sky-500"
          />
          <Card className="p-3 sm:p-5">
            {analyticsAllowed ? <SalesTrendChart data={salesTrend} /> : <LockedSection />}
          </Card>
        </div>

        <Divider />

        {/* ORDER PIPELINE + PAYMENT FLOW */}
        <OrderFlowBlocks orderStatusCards={orderStatusCards} orderAmounts={orderAmounts} />

        {vendorPayments.hasActivity && (
          <div>
            <SectionHeader
              title={t.admin.vendorPayments}
              sub={t.admin.thisPeriodFinancial}
              accentClass="bg-teal-500"
            />
            <Card className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                <OrderAmountCard
                  title={t.admin.receivedFromVendors}
                  amount={vendorPayments.received}
                  status="received"
                />
                <OrderAmountCard
                  title={t.admin.vendorDueOutstanding}
                  amount={vendorPayments.totalDue}
                  status="due"
                />
              </div>
            </Card>
          </div>
        )}

        <Divider />

        {/* TOP PRODUCTS + CUSTOMERS — stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <SectionHeader
              title={t.admin.topProductsTitle}
              sub={t.admin.byUnitsSold}
              accentClass="bg-violet-500"
            />
            <Card className="p-3 sm:p-5">
              {analyticsAllowed ? <TopProducts products={topProducts} /> : <LockedSection />}
            </Card>
          </div>
          <div>
            <SectionHeader
              title={t.admin.customerInsights}
              sub={t.admin.newReturningTop}
              accentClass="bg-cyan-500"
            />
            <Card className="p-3 sm:p-5">
              {analyticsAllowed ? <CustomerSnapshot stats={customerStats} /> : <LockedSection />}
            </Card>
          </div>
        </div>

        <Divider />

        {/* INVENTORY — 2 col mobile, 4 col xl */}
        <div>
          <SectionHeader
            title={t.admin.inventoryHealth}
            sub={t.admin.stockLevels}
            accentClass="bg-orange-500"
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            {inventoryAlerts.map((a, i) => (
              <InventoryAlertCard key={i} {...a} />
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default MainDashboard;
