"use client";

import { useState, useEffect, useMemo } from "react";
import MainDashboard from "@/app/components/admin/dashboard/dashboardComponent/MainDashboard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreOrders } from "@/lib/hook/useStoreOrders";
import { getProducts, Product } from "@/lib/queries/products/getProducts";
import { getExpensesWithCategory } from "@/lib/queries//expense/getExpensesWithCategory";
import type { Expense } from "@/lib/types/expense/type";
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

interface ProductVariant {
  id: string;
  variant_name: string;
  base_price: number;
  sale_price?: number;
  cost_price?: number;
  profit_margin?: number;
  tp_price?: number;
  stock: {
    quantity_available: number;
    low_stock_threshold?: number;
    track_inventory?: boolean;
    is_low_stock: boolean;
  };
  is_low_stock: boolean;
}

type DashboardProduct = Product & { variants: ProductVariant[] };

export default function DashboardPage() {
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
  } = useStoreOrders(storeId || "");

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [rawProducts, setRawProducts] = useState<DashboardProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const { currency, icon: CurrencyIcon } = useUserCurrencyIcon();

  const renderCurrency = (amount: number) => {
    if (!currency) return amount.toFixed(2);
    if (typeof CurrencyIcon === "string")
      return `${CurrencyIcon} ${amount.toFixed(2)}`;
    if (CurrencyIcon)
      return (
        <>
          {CurrencyIcon} {amount.toFixed(2)}
        </>
      );
    return amount.toFixed(2);
  };

  useEffect(() => {
    if (!storeId) return;
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const productsFetched = await getProducts(storeId);
        setRawProducts(productsFetched as DashboardProduct[]);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    const fetchExpenses = async () => {
      try {
        setLoadingExpenses(true);
        const result = await getExpensesWithCategory({
          storeId,
          pageSize: 10000,
          page: 1,
        });
        setRawExpenses(result.data);
      } catch (err) {
        console.error("Error fetching expenses:", err);
      } finally {
        setLoadingExpenses(false);
      }
    };
    fetchExpenses();
  }, [storeId]);

  const memoizedOrders = useMemo(() => orders, [orders]);
  const memoizedProducts = useMemo(() => rawProducts, [rawProducts]);
  const memoizedExpenses = useMemo(() => rawExpenses, [rawExpenses]);

  const metrics = useDashboardMetrics(
    storeId,
    memoizedOrders,
    memoizedProducts,
    memoizedExpenses,
    timePeriod,
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (userLoading || ordersLoading || loadingProducts || loadingExpenses) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Loading dashboard...
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
          Error fetching user data
        </h2>
        <p className="text-red-600 dark:text-red-300 mt-2">
          {userError.message}
        </p>
      </div>
    );

  if (ordersError)
    return (
      <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
        <h2 className="text-red-700 dark:text-red-400 font-semibold">
          Error fetching orders
        </h2>
      </div>
    );

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getChangeType = (n: number): "positive" | "negative" | "neutral" =>
    n > 0 ? "positive" : n < 0 ? "negative" : "neutral";

  const getPeriodLabel = (p: TimePeriod) =>
    p === "weekly"
      ? "Last 7 Days"
      : p === "monthly"
        ? "Last 30 Days"
        : "Last 365 Days";

  const getComparisonText = (p: TimePeriod) =>
    p === "weekly"
      ? "vs Prev 7 Days"
      : p === "monthly"
        ? "vs Prev 30 Days"
        : "vs Prev 365 Days";

  const fmt = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

  // ── Revenue / Order KPI cards ────────────────────────────────────────────────
  const stats = [
    {
      title: `${getPeriodLabel(timePeriod)} Revenue (Paid)`,
      value: renderCurrency(metrics.revenue),
      icon: <DollarOutlined className="text-emerald-500" />,
      change: `${fmt(metrics.changePercentage.revenue)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.revenue),
      description: `From ${metrics.paidOrders.length} paid orders`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Orders (All)`,
      value: metrics.orderCount.toString(),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
      change: `${fmt(metrics.changePercentage.orders)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.orders),
      description: `Total orders (${metrics.paidOrders.length} paid)`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Avg Order Value`,
      value: renderCurrency(metrics.averageOrderValue),
      icon: <LineChartOutlined className="text-violet-500" />,
      change: `${fmt(metrics.changePercentage.aov)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.aov),
      description: "Subtotal ÷ all orders",
    },
    {
      title: `${getPeriodLabel(timePeriod)} Gross Profit`,
      value: renderCurrency(metrics.grossProfit),
      icon: <DollarOutlined className="text-amber-500" />,
      change: `${fmt(metrics.changePercentage.profit)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.profit),
      description: "Based on product cost and selling price",
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
      ? "No revenue data"
      : expenseMetrics.expenseToRevenueRatio >= 80
        ? "⚠️ High — review costs"
        : expenseMetrics.expenseToRevenueRatio >= 60
          ? "⚡ Moderate"
          : "✅ Healthy";

  const expenseStats = [
    {
      title: `${getPeriodLabel(timePeriod)} Total Expenses`,
      value: renderCurrency(expenseMetrics.totalExpenses),
      icon: <FallOutlined className="text-rose-500" />,
      change: `${fmt(expenseMetrics.changePercentage.expenses)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(-expenseMetrics.changePercentage.expenses),
      description: `${expenseMetrics.expenseCount} expense records`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Net Profit`,
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
      description: "Gross profit minus all expenses",
    },
    {
      title: "Expense / Revenue Ratio",
      value: `${expenseMetrics.expenseToRevenueRatio}%`,
      icon: <PieChartOutlined className="text-orange-500" />,
      change: expenseRatioLabel,
      changeType: expenseRatioHealth,
      description: "% of revenue consumed by expenses",
    },
    {
      title: "Top Expense Category",
      value: expenseMetrics.topExpenseCategory.name,
      icon: <TagOutlined className="text-pink-500" />,
      change: renderCurrency(expenseMetrics.topExpenseCategory.amount),
      changeType: "neutral" as const,
      description: "Highest spend category this period",
    },
  ];

  // ── Order status cards ────────────────────────────────────────────────────────
  const orderStatusCards = [
    {
      title: "Pending",
      value: metrics.orderStatusCounts.pending.toString(),
      icon: <ExclamationOutlined className="text-amber-500" />,
      color: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      title: "Confirmed",
      value: metrics.orderStatusCounts.confirmed.toString(),
      icon: <CheckCircleOutlined className="text-blue-500" />,
      color: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      title: "Shipped",
      value: metrics.orderStatusCounts.shipped.toString(),
      icon: <ShoppingCartOutlined className="text-violet-500" />,
      color: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      title: "Delivered",
      value: metrics.orderStatusCounts.delivered.toString(),
      icon: <CheckCircleOutlined className="text-emerald-500" />,
      color: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "Cancelled",
      value: metrics.orderStatusCounts.cancelled.toString(),
      icon: <CloseCircleOutlined className="text-rose-500" />,
      color: "bg-red-50",
      textColor: "text-red-700",
    },
  ];

  // ── Inventory alerts ──────────────────────────────────────────────────────────
  const inventoryAlerts = [
    {
      title: "In Stock (Units)",
      value: metrics.inStockCount.toString(),
      icon: <CheckCircleOutlined className="text-emerald-600" />,
      color: "bg-green-100",
      actionText: "View Items",
    },
    {
      title: "Low Stock (Products)",
      value: metrics.lowStockProductCount.toString(),
      icon: <ExclamationOutlined className="text-amber-600" />,
      color: "bg-amber-100",
      actionText: "Review",
    },
    {
      title: "Out of Stock (Products)",
      value: metrics.outOfStockProductCount.toString(),
      icon: <CloseCircleOutlined className="text-rose-600" />,
      color: "bg-red-100",
      actionText: "Restock Now",
    },
    {
      title: "Inventory Sell Value",
      value: renderCurrency(metrics.totalInventoryValue),
      icon: <DatabaseOutlined className="text-indigo-600" />,
      color: "bg-indigo-100",
      actionText: "View Details",
    },
  ];

  // ── Customer stats ────────────────────────────────────────────────────────────
  const customerStats = [
    {
      title: `New Customers (${getPeriodLabel(timePeriod)})`,
      value: metrics.customerSnapshot.newCustomers.toString(),
      icon: <StarOutlined className="text-blue-500" />,
    },
    {
      title: "Returning Rate",
      value: `${metrics.customerSnapshot.returningRate}%`,
      icon: <StarOutlined className="text-emerald-500" />,
    },
    {
      title: "Top Customer",
      value: metrics.customerSnapshot.topCustomer.name,
      subValue: renderCurrency(metrics.customerSnapshot.topCustomer.totalSpent),
      icon: <StarOutlined className="text-violet-500" />,
    },
  ];

  // ── Payment amounts ───────────────────────────────────────────────────────────
  const orderAmounts = [
    {
      title: "Pending Amount",
      amount: metrics.paymentAmounts.pending,
      status: "pending" as const,
    },
    {
      title: "Paid Amount",
      amount: metrics.paymentAmounts.paid,
      status: "paid" as const,
    },
    {
      title: "Refunded Amount",
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
