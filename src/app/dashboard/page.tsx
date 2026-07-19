"use client";

import { useState, useEffect } from "react";
import MainDashboard from "@/app/components/admin/dashboard/dashboardComponent/MainDashboard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import {
  getDashboardSummary,
  DashboardSummaryPayload,
} from "@/lib/queries/dashboard/getDashboardSummary";
import { getDashboardPeriodRange } from "@/lib/utils/dashboardPeriods";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ExclamationOutlined,
  CloseCircleOutlined,
  StarOutlined,
  DatabaseOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  useDashboardMetrics,
  TimePeriod,
} from "@/lib/hook/useDashboardMetrics";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

export default function DashboardPage() {
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [summary, setSummary] = useState<DashboardSummaryPayload | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<Error | null>(null);

  const t = useTranslation();
  const n = useLocalNum();
  const { currency, icon: CurrencyIcon } = useUserCurrencyIcon();

  const renderCurrency = (amount: number) => {
    if (!currency) return n(amount.toFixed(2));
    if (typeof CurrencyIcon === "string")
      return `${CurrencyIcon} ${n(amount.toFixed(2))}`;
    if (CurrencyIcon)
      return (
        <>
          {CurrencyIcon} {n(amount.toFixed(2))}
        </>
      );
    return n(amount.toFixed(2));
  };

  useEffect(() => {
    if (!storeId) return;
    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        setSummaryError(null);
        const { periodStart, periodEnd, prevPeriodStart, prevPeriodEnd } =
          getDashboardPeriodRange(timePeriod);
        const result = await getDashboardSummary(
          storeId,
          periodStart,
          periodEnd,
          prevPeriodStart,
          prevPeriodEnd,
        );
        setSummary(result);
      } catch (err) {
        console.error("Error fetching dashboard summary:", err);
        setSummaryError(
          err instanceof Error ? err : new Error("Failed to load dashboard"),
        );
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [storeId, timePeriod]);

  const metrics = useDashboardMetrics(summary);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (userLoading || loadingSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            {t.admin.loadingDashboard}
          </p>
        </div>
      </div>
    );
  }

  // ── Errors ───────────────────────────────────────────────────────────────────
  if (userError)
    return (
      <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
        <h2 className="text-red-700 dark:text-red-400 font-semibold">
          {t.admin.errorFetchingUser}
        </h2>
        <p className="text-red-600 dark:text-red-300 mt-2">
          {userError.message}
        </p>
      </div>
    );

  if (summaryError)
    return (
      <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
        <h2 className="text-red-700 dark:text-red-400 font-semibold">
          {t.admin.errorFetchingOrders}
        </h2>
        <p className="text-red-600 dark:text-red-300 mt-2">
          {summaryError.message}
        </p>
      </div>
    );

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getChangeType = (val: number): "positive" | "negative" | "neutral" =>
    val > 0 ? "positive" : val < 0 ? "negative" : "neutral";

  const getPeriodLabel = (p: TimePeriod) =>
    p === "weekly"
      ? t.admin.periodLast7
      : p === "monthly"
        ? t.admin.periodLast30
        : t.admin.periodLast365;

  const getComparisonText = (p: TimePeriod) =>
    p === "weekly"
      ? t.admin.vsPrev7
      : p === "monthly"
        ? t.admin.vsPrev30
        : t.admin.vsPrev365;

  const fmt = (pct: number) => `${pct > 0 ? "+" : ""}${n(pct.toFixed(1))}%`;

  // ── Revenue / Order KPI cards ────────────────────────────────────────────────
  const stats = [
    {
      title: `${getPeriodLabel(timePeriod)} ${t.admin.revenuePaid}`,
      value: renderCurrency(metrics.revenue),
      icon: <DollarOutlined className="text-emerald-500" />,
      change: `${fmt(metrics.changePercentage.revenue)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.revenue),
      description: `${n(metrics.paidOrdersCount)} ${t.admin.fromPaidOrders}`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} ${t.admin.ordersAll}`,
      value: n(metrics.orderCount),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
      change: `${fmt(metrics.changePercentage.orders)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.orders),
      description: `${t.admin.totalOrdersOf} (${n(metrics.paidOrdersCount)} ${t.admin.paid})`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} ${t.admin.avgOrderValue}`,
      value: renderCurrency(metrics.averageOrderValue),
      icon: <LineChartOutlined className="text-violet-500" />,
      change: `${fmt(metrics.changePercentage.aov)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.aov),
      description: t.admin.subtotalAllOrders,
    },
    {
      title: `${getPeriodLabel(timePeriod)} ${t.admin.grossProfit}`,
      value: renderCurrency(metrics.grossProfit),
      icon: <DollarOutlined className="text-amber-500" />,
      change: `${fmt(metrics.changePercentage.profit)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.profit),
      description: t.admin.basedOnCost,
    },
  ];

  // ── Expense / Financial KPI cards ────────────────────────────────────────────
  const { expenseMetrics } = metrics;

  const expenseRatioHealth: "positive" | "negative" | "neutral" =
    expenseMetrics.expenseToRevenueRatio === 0
      ? "neutral"
      : expenseMetrics.expenseToRevenueRatio >= 80
        ? "negative"
        : expenseMetrics.expenseToRevenueRatio >= 60
          ? "neutral"
          : "positive";

  const expenseRatioLabel =
    expenseMetrics.expenseToRevenueRatio === 0
      ? t.admin.noRevenueData
      : expenseMetrics.expenseToRevenueRatio >= 80
        ? t.admin.highReviewCosts
        : expenseMetrics.expenseToRevenueRatio >= 60
          ? t.admin.moderate
          : t.admin.healthy;

  const expenseStats = [
    {
      title: `${getPeriodLabel(timePeriod)} ${t.admin.totalExpenses}`,
      value: renderCurrency(expenseMetrics.totalExpenses),
      icon: <FallOutlined className="text-rose-500" />,
      change: `${fmt(expenseMetrics.changePercentage.expenses)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(-expenseMetrics.changePercentage.expenses),
      description: `${n(expenseMetrics.expenseCount)} ${t.admin.expenseRecords}`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} ${t.admin.netProfit}`,
      value: renderCurrency(expenseMetrics.netProfit),
      icon: (
        <RiseOutlined
          className={
            expenseMetrics.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
          }
        />
      ),
      change: `${fmt(expenseMetrics.changePercentage.netProfit)} ${getComparisonText(timePeriod)}`,
      changeType:
        expenseMetrics.netProfit < 0
          ? "negative"
          : getChangeType(expenseMetrics.changePercentage.netProfit),
      description: t.admin.grossProfitMinus,
    },
    {
      title: t.admin.expenseRevenueRatio,
      value: `${n(expenseMetrics.expenseToRevenueRatio)}%`,
      icon: <PieChartOutlined className="text-orange-500" />,
      change: expenseRatioLabel,
      changeType: expenseRatioHealth,
      description: t.admin.percentRevenue,
    },
    {
      title: t.admin.topExpenseCategory,
      value: expenseMetrics.topExpenseCategory.name,
      icon: <TagOutlined className="text-pink-500" />,
      change: renderCurrency(expenseMetrics.topExpenseCategory.amount),
      changeType: "neutral" as const,
      description: t.admin.highestSpendCat,
    },
  ];

  // ── Order status cards ────────────────────────────────────────────────────────
  const orderStatusCards = [
    {
      title: t.admin.pending,
      value: n(metrics.orderStatusCounts.pending),
      icon: <ExclamationOutlined className="text-amber-500" />,
      color: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      title: t.admin.confirmed,
      value: n(metrics.orderStatusCounts.confirmed),
      icon: <CheckCircleOutlined className="text-blue-500" />,
      color: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      title: t.admin.shipped,
      value: n(metrics.orderStatusCounts.shipped),
      icon: <ShoppingCartOutlined className="text-violet-500" />,
      color: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      title: t.admin.delivered,
      value: n(metrics.orderStatusCounts.delivered),
      icon: <CheckCircleOutlined className="text-emerald-500" />,
      color: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: t.admin.cancelled,
      value: n(metrics.orderStatusCounts.cancelled),
      icon: <CloseCircleOutlined className="text-rose-500" />,
      color: "bg-red-50",
      textColor: "text-red-700",
    },
  ];

  // ── Inventory alerts ──────────────────────────────────────────────────────────
  const inventoryAlerts = [
    {
      title: t.admin.inStockUnits,
      value: n(metrics.inStockCount),
      icon: <CheckCircleOutlined className="text-emerald-600" />,
      color: "bg-green-100",
      actionText: t.admin.viewItems,
    },
    {
      title: t.admin.lowStockProducts,
      value: n(metrics.lowStockProductCount),
      icon: <ExclamationOutlined className="text-amber-600" />,
      color: "bg-amber-100",
      actionText: t.admin.review,
    },
    {
      title: t.admin.outOfStockProducts,
      value: n(metrics.outOfStockProductCount),
      icon: <CloseCircleOutlined className="text-rose-600" />,
      color: "bg-red-100",
      actionText: t.admin.restockNow,
    },
    {
      title: t.admin.inventorySellValue,
      value: renderCurrency(metrics.totalInventoryValue),
      icon: <DatabaseOutlined className="text-indigo-600" />,
      color: "bg-indigo-100",
      actionText: t.admin.viewDetails,
    },
  ];

  // ── Customer stats ────────────────────────────────────────────────────────────
  const customerStats = [
    {
      title: `${t.admin.newCustomers} (${getPeriodLabel(timePeriod)})`,
      value: n(metrics.customerSnapshot.newCustomers),
      icon: <StarOutlined className="text-blue-500" />,
    },
    {
      title: t.admin.returningRate,
      value: `${n(metrics.customerSnapshot.returningRate)}%`,
      icon: <StarOutlined className="text-emerald-500" />,
    },
    {
      title: t.admin.topCustomer,
      value: metrics.customerSnapshot.topCustomer.name,
      subValue: renderCurrency(metrics.customerSnapshot.topCustomer.totalSpent),
      icon: <StarOutlined className="text-violet-500" />,
    },
  ];

  // ── Payment amounts ───────────────────────────────────────────────────────────
  const orderAmounts = [
    {
      title: t.admin.pendingAmount,
      amount: metrics.paymentAmounts.pending,
      status: "pending" as const,
    },
    {
      title: t.admin.paidAmount,
      amount: metrics.paymentAmounts.paid,
      status: "paid" as const,
    },
    {
      title: t.admin.refundedAmount,
      amount: metrics.paymentAmounts.refunded,
      status: "refunded" as const,
    },
  ];

  const topProductsDisplay = metrics.topProducts.map((p) => ({
    name: p.name,
    revenue: p.revenue,
    quantity: p.quantity,
  }));

  return (
    <MainDashboard
      stats={stats}
      expenseStats={expenseStats}
      expenseCategoryBreakdown={expenseMetrics.expenseCategoryBreakdown}
      orderStatusCards={orderStatusCards}
      orderAmounts={orderAmounts}
      inventoryAlerts={inventoryAlerts}
      salesTrend={metrics.salesTrend}
      topProducts={topProductsDisplay}
      customerStats={customerStats}
      alerts={metrics.alerts}
      timePeriod={timePeriod}
      onTimePeriodChange={setTimePeriod}
    />
  );
}
