// app/components/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import MainDashboard from "@/app/components/admin/dashboard/dashboardComponent/MainDashboard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreOrders } from "@/lib/hook/useStoreOrders";
import { getProducts, Product } from "@/lib/queries/products/getProducts";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ExclamationOutlined,
  StarOutlined,
} from "@ant-design/icons";

import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  useDashboardMetrics,
  TimePeriod,
} from "@/lib/hook/useDashboardMetrics";

// Define types that match the useDashboardMetrics hook
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

// Use intersection type to preserve the original Product type
type DashboardProduct = Product & {
  variants: ProductVariant[];
};

export default function DashboardPage() {
  // 1. Fetch user and store data
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
  } = useStoreOrders(storeId || "");

  // 2. State for products and time period
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("daily");
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // 3. Currency formatting
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

  // 4. Fetch products when storeId is available
  useEffect(() => {
    if (storeId) {
      const fetchProducts = async () => {
        if (!storeId) return;

        try {
          setLoadingProducts(true);
          const productsFetched = await getProducts(storeId);
          // Cast to DashboardProduct - this should now work since we're using intersection type
          setProducts(productsFetched as DashboardProduct[]);
        } catch (err) {
          console.error("Error fetching products:", err);
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchProducts();
    }
  }, [storeId]);

  // 5. Calculate all metrics using custom hook
  const metrics = useDashboardMetrics(storeId, orders, products, timePeriod);

  // 6. Loading and error states
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

  if (userError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error fetching user data</h2>
        <p className="text-red-600 mt-2">{userError.message}</p>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Error fetching orders</h2>
        <p className="text-red-600 mt-2">{ordersError}</p>
      </div>
    );
  }

  // 7. Helper functions for UI
  const getChangeType = (
    percentage: number
  ): "positive" | "negative" | "neutral" =>
    percentage > 0 ? "positive" : percentage < 0 ? "negative" : "neutral";

  // UPDATED: Based on OPTION 2 implementation (current vs previous)
  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case "daily":
        return "Today's"; // Current: Today (not Yesterday)
      case "weekly":
        return "This Week's"; // Current: This Week (not Last Week)
      case "monthly":
        return "This Month's"; // Current: This Month (not Last Month)
      case "yearly":
        return "This Year's"; // Current: This Year (not Last Year)
      default:
        return "";
    }
  };

  // UPDATED: Comparison text for OPTION 2
  const getComparisonText = (period: TimePeriod): string => {
    switch (period) {
      case "daily":
        return "vs Yesterday"; // Today vs Yesterday (not Day Before Yesterday)
      case "weekly":
        return "vs Last Week"; // This Week vs Last Week (not Week Before Last)
      case "monthly":
        return "vs Last Month"; // This Month vs Last Month (not Month Before Last)
      case "yearly":
        return "vs Last Year"; // This Year vs Last Year (not Year Before Last)
      default:
        return "";
    }
  };

  const formatChangeText = (percentage: number, period: TimePeriod) => {
    const sign = percentage > 0 ? "+" : "";
    return `${sign}${percentage.toFixed(1)}% ${getComparisonText(period)}`;
  };

  // 8. Stats for KPI cards - Now showing current period data
  const stats = [
    {
      title: `${getPeriodLabel(timePeriod)} Revenue (Paid)`,
      value: renderCurrency(metrics.revenue),
      icon: <DollarOutlined className="text-green-500" />,
      change: formatChangeText(metrics.changePercentage.revenue, timePeriod),
      changeType: getChangeType(metrics.changePercentage.revenue),
      description: `From ${metrics.paidOrders.length} paid orders`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Orders`,
      value: metrics.orderCount.toString(),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
      change: formatChangeText(metrics.changePercentage.orders, timePeriod),
      changeType: getChangeType(metrics.changePercentage.orders),
      description: `Total orders (${metrics.paidOrders.length} paid)`,
    },
    {
      title: `${getPeriodLabel(timePeriod)} Avg Order Value (All Orders)`,
      value: renderCurrency(metrics.averageOrderValue),
      icon: <LineChartOutlined className="text-purple-500" />,
      change: formatChangeText(metrics.changePercentage.aov, timePeriod),
      changeType: getChangeType(metrics.changePercentage.aov),
      description: "Revenue ÷ total orders",
    },
    {
      title: `${getPeriodLabel(timePeriod)} Gross Profit (Paid)`,
      value: renderCurrency(metrics.grossProfit),
      icon: <DollarOutlined className="text-amber-500" />,
      change: formatChangeText(metrics.changePercentage.profit, timePeriod),
      changeType: getChangeType(metrics.changePercentage.profit),
      description: "Based on actual product costs & margins",
    },
  ];

  // 9. Order status cards (all orders)
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
      icon: <SyncOutlined className="text-blue-500" />,
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

  // 10. Inventory alerts
  const inventoryAlerts = [
    {
      title: "In Stock (Items)",
      value: metrics.inStockCount.toString(),
      icon: <CheckCircleOutlined className="text-green-600" />,
      color: "bg-green-100",
      actionText: "View Items",
    },
    {
      title: "Low Stock (Products)",
      value: metrics.lowStockCount.toString(),
      icon: <ExclamationOutlined className="text-amber-600" />,
      color: "bg-amber-100",
      actionText: "Review",
    },
    {
      title: "Out of Stock (Products)",
      value: metrics.outOfStockCount.toString(),
      icon: <CloseCircleOutlined className="text-red-600" />,
      color: "bg-red-100",
      actionText: "Restock Now",
    },
  ];
  // 11. Customer stats - Note: New customers now shows for current period
  const customerStats = [
    {
      title: `New Customers (${
        timePeriod === "daily"
          ? "Today"
          : timePeriod === "weekly"
          ? "This Week"
          : timePeriod === "monthly"
          ? "This Month"
          : "This Year"
      })`,
      value: metrics.customerSnapshot.newCustomers.toString(),
      icon: <UserOutlined className="text-blue-500" />,
    },
    {
      title: "Returning Rate",
      value: `${metrics.customerSnapshot.returningRate}%`,
      icon: <UserOutlined className="text-green-500" />,
    },
    {
      title: "Top Customer",
      value: metrics.customerSnapshot.topCustomer.name,
      subValue: renderCurrency(metrics.customerSnapshot.topCustomer.totalSpent),
      icon: <StarOutlined className="text-purple-500" />,
    },
  ];

  // 12. Order amounts by payment status
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

  // 13. Top products - Now shows top products for current period
  const topProductsDisplay = metrics.topProducts.map((product) => ({
    name: product.name,
    revenue: product.revenue,
    quantity: product.quantity,
  }));

  // 14. Sales trend data
  const enhancedSalesTrend = metrics.salesTrend.map((day) => ({
    date: day.date,
    sales: day.sales,
  }));

  // 15. Alerts
  const enhancedAlerts = metrics.alerts.map((alert) => ({
    type: alert.type,
    message: alert.message,
    count: alert.count,
  }));

  // 16. Render the main dashboard
  return (
    <div className="dashboard-container">
      <MainDashboard
        stats={stats}
        orderStatusCards={orderStatusCards}
        orderAmounts={orderAmounts}
        inventoryAlerts={inventoryAlerts}
        salesTrend={enhancedSalesTrend}
        topProducts={topProductsDisplay}
        customerStats={customerStats}
        alerts={enhancedAlerts}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />
    </div>
  );
}
