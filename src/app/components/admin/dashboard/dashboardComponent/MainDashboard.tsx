"use client";

import React from "react";
import StatCard from "./StatCard";
import InventoryAlertCard from "./InventoryAlertCard";
import OrderAmountCard from "./OrderAmountCard";
import SalesTrendChart from "./SalesTrendChart";
import TopProducts from "./TopProducts";
import CustomerSnapshot from "./CustomerSnapshot";
import AlertsSection from "./AlertsSection";

type TimePeriod = "weekly" | "monthly" | "yearly";

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
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
}

// ─── Period Selector ──────────────────────────────────────────────────────────
const PeriodSelector: React.FC<{
  value: TimePeriod;
  onChange: (v: TimePeriod) => void;
}> = ({ value, onChange }) => (
  <div
    className="inline-flex items-center rounded-xl p-1 gap-0.5
    bg-gray-100 dark:bg-gray-800
    border border-gray-200 dark:border-gray-700"
  >
    {(
      [
        ["weekly", "7D"],
        ["monthly", "30D"],
        ["yearly", "1Y"],
      ] as [TimePeriod, string][]
    ).map(([key, label]) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold tracking-wider transition-all duration-150
          ${
            value === key
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  title: string;
  sub?: string;
  accentClass?: string;
}> = ({ title, sub, accentClass = "bg-indigo-500" }) => (
  <div className="flex items-center gap-3 mb-3 sm:mb-4">
    <div className={`w-0.5 h-5 rounded-full shrink-0 ${accentClass}`} />
    <div>
      <h3
        className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em]
        text-primary "
      >
        {title}
      </h3>
      {sub && (
        <p className="text-[9px] sm:text-[10px] mt-0.5 text-primary ">{sub}</p>
      )}
    </div>
  </div>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div className="h-px bg-linear-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`rounded-2xl bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-700
    shadow-sm dark:shadow-none ${className}`}
  >
    {children}
  </div>
);

// ─── P&L Hero Bar ─────────────────────────────────────────────────────────────
const PLHeroBar: React.FC<{
  revenue: React.ReactNode;
  expenses: React.ReactNode;
  netProfit: React.ReactNode;
  netChangeType: "positive" | "negative" | "neutral";
  periodLabel: string;
}> = ({ revenue, expenses, netProfit, netChangeType, periodLabel }) => {
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
            value: "text-gray-600 dark:text-gray-300",
            bg: "bg-gray-50 dark:bg-gray-800",
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
      ${bg} ${borderRight ? "border-r border-gray-200 dark:border-gray-700" : ""}`}
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
      <span className="text-[8px] sm:text-[9px] uppercase tracking-widest mt-0.5 text-gray-400 dark:text-gray-500">
        {periodLabel}
      </span>
    </div>
  );

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-4 sm:mb-6
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700
      shadow-sm dark:shadow-none"
    >
      <div className="grid grid-cols-3">
        <PLCell
          bg="bg-emerald-50 dark:bg-emerald-500/10"
          textCls="text-emerald-600 dark:text-emerald-300"
          glyph="▲"
          label="Revenue"
          val={revenue}
          borderRight
        />
        <PLCell
          bg="bg-rose-50 dark:bg-rose-500/10"
          textCls="text-rose-600 dark:text-rose-300"
          glyph="▼"
          label="Expenses"
          val={expenses}
          borderRight
        />
        <PLCell
          bg={netStyle.bg}
          textCls={netStyle.value}
          glyph={netStyle.glyph}
          label="Net Profit"
          val={netProfit}
        />
      </div>
    </div>
  );
};

// ─── Order Status Row ─────────────────────────────────────────────────────────
const statusConfig: Record<string, { text: string; bg: string; dot: string }> =
  {
    Pending: {
      text: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
      dot: "bg-amber-400",
    },
    Confirmed: {
      text: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25",
      dot: "bg-blue-400",
    },
    Shipped: {
      text: "text-violet-700 dark:text-violet-300",
      bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25",
      dot: "bg-violet-400",
    },
    Delivered: {
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
      dot: "bg-emerald-400",
    },
    Cancelled: {
      text: "text-rose-700 dark:text-rose-300",
      bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
      dot: "bg-rose-400",
    },
  };

const OrderStatusRow: React.FC<{ title: string; value: string }> = ({
  title,
  value,
}) => {
  const cfg = statusConfig[title] ?? {
    text: "text-gray-600 dark:text-gray-300",
    bg: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
  };
  return (
    <div
      className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border transition-colors ${cfg.bg}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className={`text-xs sm:text-sm font-semibold ${cfg.text}`}>
          {title}
        </span>
      </div>
      <span
        className={`text-xl sm:text-2xl font-black tabular-nums ${cfg.text}`}
      >
        {value}
      </span>
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
  timePeriod,
  onTimePeriodChange,
}) => {
  const periodLabel =
    timePeriod === "weekly"
      ? "Last 7 Days"
      : timePeriod === "monthly"
        ? "Last 30 Days"
        : "Last 365 Days";

  const revenueValue = stats[0]?.value ?? "—";
  const expensesValue = expenseStats[0]?.value ?? "—";
  const netProfitValue = expenseStats[1]?.value ?? "—";
  const netChangeType = expenseStats[1]?.changeType ?? "neutral";

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="min-h-screen pb-16 sm:pb-20
      bg-gray-50 dark:bg-gray-950
      text-gray-900 dark:text-gray-100"
    >
      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl
        bg-gray-50/90 dark:bg-gray-950/90
        border-b border-gray-200 dark:border-gray-800"
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
                text-gray-900 dark:text-white"
              >
                Business Overview
              </p>
              <p
                className="text-[9px] sm:text-[10px] mt-0.5 hidden sm:block
                text-black dark:text-white"
              >
                {dateStr}
              </p>
            </div>
          </div>
          <PeriodSelector value={timePeriod} onChange={onTimePeriodChange} />
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-400 mx-auto px-3 sm:px-6 pt-4 sm:pt-7 space-y-5 sm:space-y-8">
        {/* ALERTS */}
        {alerts.length > 0 && (
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
                {alerts.length} Alert{alerts.length > 1 ? "s" : ""} · Action
                Required
              </span>
            </div>
            <AlertsSection alerts={alerts} />
          </div>
        )}

        {/* P&L HERO */}
        <div>
          <SectionHeader
            title="P&L Snapshot"
            sub={`${periodLabel} · Revenue vs Expenses vs Net Profit`}
            accentClass="bg-emerald-500"
          />
          <PLHeroBar
            revenue={revenueValue}
            expenses={expensesValue}
            netProfit={netProfitValue}
            netChangeType={netChangeType}
            periodLabel={periodLabel}
          />
          {expenseCategoryBreakdown && expenseCategoryBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              <span
                className="text-[9px] sm:text-[10px] uppercase tracking-wider self-center
                text-gray-400 dark:text-gray-500"
              >
                Expense split:
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
            title="Revenue & Orders"
            sub={`${periodLabel} performance`}
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
            title="Financial Health"
            sub="Expenses · Net Profit · Burn Rate · Top Category"
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
            title="Sales Trend"
            sub="Daily paid revenue · Last 30 days"
            accentClass="bg-sky-500"
          />
          <Card className="p-3 sm:p-5">
            <SalesTrendChart data={salesTrend} />
          </Card>
        </div>

        <Divider />

        {/* ORDER PIPELINE + PAYMENT FLOW — stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <SectionHeader
              title="Order Pipeline"
              sub="All-time status breakdown"
              accentClass="bg-amber-500"
            />
            <Card className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              {orderStatusCards.map((c, i) => (
                <OrderStatusRow key={i} title={c.title} value={c.value} />
              ))}
            </Card>
          </div>
          <div>
            <SectionHeader
              title="Payment Flow"
              sub="All-time financial summary"
              accentClass="bg-emerald-500"
            />
            <Card className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              {orderAmounts.map((c, i) => (
                <OrderAmountCard
                  key={i}
                  title={c.title}
                  amount={c.amount}
                  status={c.status}
                />
              ))}
            </Card>
          </div>
        </div>

        <Divider />

        {/* TOP PRODUCTS + CUSTOMERS — stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <SectionHeader
              title="Top Products"
              sub="By units sold · Paid orders only"
              accentClass="bg-violet-500"
            />
            <Card className="p-3 sm:p-5">
              <TopProducts products={topProducts} />
            </Card>
          </div>
          <div>
            <SectionHeader
              title="Customer Insights"
              sub="New · Returning · Top spender"
              accentClass="bg-cyan-500"
            />
            <Card className="p-3 sm:p-5">
              <CustomerSnapshot stats={customerStats} />
            </Card>
          </div>
        </div>

        <Divider />

        {/* INVENTORY — 2 col mobile, 4 col xl */}
        <div>
          <SectionHeader
            title="Inventory Health"
            sub="Stock levels across all products"
            accentClass="bg-orange-500"
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            {inventoryAlerts.map((a, i) => (
              <InventoryAlertCard key={i} {...a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
