"use client";

import { useState, useEffect } from "react";
import MainDashboard from "@/app/components/admin/dashboard/dashboardComponent/MainDashboard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreOrders } from "@/lib/hook/useStoreOrders";
import { getProducts, Product } from "@/lib/queries/products/getProducts";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ExclamationOutlined,
  CloseCircleOutlined,
  StarOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  useDashboardMetrics,
  TimePeriod,
} from "@/lib/hook/useDashboardMetrics";

// Product + Variant types
interface ProductVariant {
  id: string;
  variant_name: string;
  base_price: number;
  sale_price?: number;
  cost_price?: number;
  profit_margin?: number;
  stock: {
    quantity_available: number;
    low_stock_threshold?: number;
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

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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

  // Fetch products
  useEffect(() => {
    if (!storeId) return;
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const productsFetched = await getProducts(storeId);
        setProducts(productsFetched as DashboardProduct[]);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [storeId]);

  const metrics = useDashboardMetrics(storeId, orders, products, timePeriod);

  // Loading and error states
  if (userLoading || ordersLoading || loadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (userError)
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error fetching user data</h2>
        <p className="text-red-600 mt-2">{userError.message}</p>
      </div>
    );
  if (ordersError)
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error fetching orders</h2>
        {/* <p className="text-red-600 mt-2">{ordersError.message}</p> */}
      </div>
    );

  // KPI cards helpers
  const getChangeType = (
    percentage: number,
  ): "positive" | "negative" | "neutral" =>
    percentage > 0 ? "positive" : percentage < 0 ? "negative" : "neutral";
  const getPeriodLabel = (period: TimePeriod): string =>
    period === "weekly"
      ? "This Week's"
      : period === "monthly"
        ? "This Month's"
        : "This Year's";
  const getComparisonText = (period: TimePeriod): string =>
    period === "weekly"
      ? "vs Last Week"
      : period === "monthly"
        ? "vs Last Month"
        : "vs Last Year";
  const formatChangeText = (percentage: number) =>
    `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}%`;

  // KPI Cards
  const stats = [
    {
      title: `${getPeriodLabel(timePeriod)} Revenue (Paid)`,
      value: renderCurrency(metrics.revenue),
      icon: <DollarOutlined className="text-green-500" />,
      change: `${formatChangeText(metrics.changePercentage.revenue)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.revenue),
      description: `From ${metrics.paidOrders.length} paid orders`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Orders (All)`,
      value: metrics.orderCount.toString(),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
      change: `${formatChangeText(metrics.changePercentage.orders)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.orders),
      description: `Total orders (${metrics.paidOrders.length} paid)`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Avg Order Value`,
      value: renderCurrency(metrics.averageOrderValue),
      icon: <LineChartOutlined className="text-purple-500" />,
      change: `${formatChangeText(metrics.changePercentage.aov)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.aov),
      description: "Revenue ÷ total orders",
    },
    {
      title: `${getPeriodLabel(timePeriod)} Gross Profit`,
      value: renderCurrency(metrics.grossProfit),
      icon: <DollarOutlined className="text-amber-500" />,
      change: `${formatChangeText(metrics.changePercentage.profit)} ${getComparisonText(timePeriod)}`,
      changeType: getChangeType(metrics.changePercentage.profit),
      description: "Based on product cost and selling price",
    },
    // {
    //   title: "Total Inventory Value",
    //   value: renderCurrency(metrics.totalInventoryValue),
    //   icon: <DatabaseOutlined className="text-indigo-500" />,
    //   change: "Current inventory worth",
    //   changeType: "neutral" as const,
    //   description: `${metrics.inStockCount} units at cost price`,
    // },
  ];

  // Order status cards
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
      icon: <ShoppingCartOutlined className="text-purple-500" />,
      color: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      title: "Delivered",
      value: metrics.orderStatusCounts.delivered.toString(),
      icon: <CheckCircleOutlined className="text-green-500" />,
      color: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "Cancelled",
      value: metrics.orderStatusCounts.cancelled.toString(),
      icon: <CloseCircleOutlined className="text-red-500" />,
      color: "bg-red-50",
      textColor: "text-red-700",
    },
  ];

  // Inventory alerts
  const inventoryAlerts = [
    {
      title: "In Stock (Units)",
      value: metrics.inStockCount.toString(),
      icon: <CheckCircleOutlined className="text-green-600" />,
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
      icon: <CloseCircleOutlined className="text-red-600" />,
      color: "bg-red-100",
      actionText: "Restock Now",
    },
    {
      title: "Inventory Value",
      value: renderCurrency(metrics.totalInventoryValue),
      icon: <DatabaseOutlined className="text-indigo-600" />,
      color: "bg-indigo-100",
      actionText: "View Details",
    },
  ];

  // Customer stats
  const customerStats = [
    {
      title: `New Customers (${getPeriodLabel(timePeriod)})`,
      value: metrics.customerSnapshot.newCustomers.toString(),
      icon: <StarOutlined className="text-blue-500" />,
    },
    {
      title: "Returning Rate",
      value: `${metrics.customerSnapshot.returningRate}%`,
      icon: <StarOutlined className="text-green-500" />,
    },
    {
      title: "Top Customer",
      value: metrics.customerSnapshot.topCustomer.name,
      subValue: renderCurrency(metrics.customerSnapshot.topCustomer.totalSpent),
      icon: <StarOutlined className="text-purple-500" />,
    },
  ];

  // Payment amounts
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
  const salesTrend = metrics.salesTrend;
  const alerts = metrics.alerts;

  return (
    <div className="dashboard-container">
      <MainDashboard
        stats={stats}
        orderStatusCards={orderStatusCards}
        orderAmounts={orderAmounts}
        inventoryAlerts={inventoryAlerts}
        salesTrend={salesTrend}
        topProducts={topProductsDisplay}
        customerStats={customerStats}
        alerts={alerts}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />
    </div>
  );
}
