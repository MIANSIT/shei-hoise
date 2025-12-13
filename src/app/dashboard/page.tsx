"use client";

import { useEffect, useState, useCallback } from "react";
import MainDashboard from "@/app/components/admin/dashboard/dashboardComponent/MainDashboard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStoreOrders } from "@/lib/hook/useStoreOrders";
import { getProducts } from "@/lib/queries/products/getProducts";
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

import type { Product } from "@/lib/queries/products/getProducts";
import type { StoreOrder } from "@/lib/types/order";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";
type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
type PaymentStatus = "paid" | "pending" | "refunded";
type AlertType = "stock" | "order" | "payment";

export default function DashboardPage() {
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
  } = useStoreOrders(storeId || "");
  const { currency, icon: CurrencyIcon } = useUserCurrencyIcon();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("daily");
  const [products, setProducts] = useState<Product[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [orderStatusCounts, setOrderStatusCounts] = useState<
    Record<OrderStatus, number>
  >({
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [salesTrend, setSalesTrend] = useState<
    { date: string; sales: number }[]
  >([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [customerSnapshot, setCustomerSnapshot] = useState<{
    newCustomers: number;
    returningRate: number;
    topCustomer: { name: string; totalSpent: number };
  }>({
    newCustomers: 0,
    returningRate: 0,
    topCustomer: { name: "", totalSpent: 0 },
  });
  const [topProducts, setTopProducts] = useState<
    { name: string; revenue: number; quantity: number }[]
  >([]);
  const [alerts, setAlerts] = useState<
    { type: AlertType; message: string; count: number }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [changePercentage, setChangePercentage] = useState({
    revenue: 0,
    orders: 0,
    aov: 0,
    profit: 0,
  });

  // Helper function to check if an order is paid
  const isOrderPaid = (order: StoreOrder): boolean => {
    return order.payment_status?.toLowerCase() === "paid";
  };

  // ================== Payment Amounts by payment_status ==================
  const paymentAmounts: Record<PaymentStatus, number> = {
    paid: 0,
    pending: 0,
    refunded: 0,
  };
  orders.forEach((order) => {
    const amount = Number(order.total_amount) || 0;
    const key = (order.payment_status?.toLowerCase() ||
      "pending") as PaymentStatus;
    if (key in paymentAmounts) paymentAmounts[key] += amount;
  });

  const renderCurrency = (amount: number) => {
    if (!currency) return amount.toFixed(2);
    if (typeof CurrencyIcon === "string")
      return `${CurrencyIcon} ${amount.toFixed(2)}`;
    if (CurrencyIcon)
      return (
        <>
          <CurrencyIcon /> {amount.toFixed(2)}
        </>
      );
    return amount.toFixed(2);
  };

  // ================== Filter orders by period ==================
  const filterOrdersByPeriod = (
    ordersList: StoreOrder[],
    period: TimePeriod
  ) => {
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "daily":
        startDate.setDate(now.getDate() - 1);
        break;
      case "weekly":
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "yearly":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    return ordersList.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= now;
    });
  };

  // ================== Calculate metrics per period ==================
  const calculatePeriodMetrics = useCallback(
    (period: TimePeriod) => {
      // All orders for the period (for order count and AOV)
      const filteredOrders = filterOrdersByPeriod(orders, period);

      // Paid orders only (for revenue and profit)
      const paidOrders = filteredOrders.filter(isOrderPaid);

      // Calculate metrics
      const currentRevenue = paidOrders.reduce(
        (sum, o) => sum + o.subtotal,
        0
      );
      const currentOrderCount = filteredOrders.length;
      const currentAOV =
        currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
      const currentProfit = currentRevenue * 0.6; // Assuming 60% profit margin

      setRevenue(currentRevenue);
      setOrderCount(currentOrderCount);
      setAverageOrderValue(currentAOV);

      // Previous period calculations
      const now = new Date();
      const prevStart = new Date();
      const prevEnd = new Date();
      switch (period) {
        case "daily":
          prevStart.setDate(now.getDate() - 2);
          prevEnd.setDate(now.getDate() - 1);
          break;
        case "weekly":
          prevStart.setDate(now.getDate() - 14);
          prevEnd.setDate(now.getDate() - 7);
          break;
        case "monthly":
          prevStart.setMonth(now.getMonth() - 2);
          prevEnd.setMonth(now.getMonth() - 1);
          break;
        case "yearly":
          prevStart.setFullYear(now.getFullYear() - 2);
          prevEnd.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Previous period - all orders
      const prevPeriodOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= prevStart && orderDate <= prevEnd;
      });

      // Previous period - paid orders only
      const prevPeriodPaidOrders = prevPeriodOrders.filter(isOrderPaid);

      const prevRevenue = prevPeriodPaidOrders.reduce(
        (sum, o) => sum + o.subtotal,
        0
      );
      const prevOrderCount = prevPeriodOrders.length;
      const prevAOV = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;
      const prevProfit = prevRevenue * 0.6;

      const calculateChange = (current: number, previous: number) =>
        previous === 0
          ? current > 0
            ? 100
            : 0
          : ((current - previous) / previous) * 100;

      setChangePercentage({
        revenue: calculateChange(currentRevenue, prevRevenue),
        orders: calculateChange(currentOrderCount, prevOrderCount),
        aov: calculateChange(currentAOV, prevAOV),
        profit: calculateChange(currentProfit, prevProfit),
      });
    },
    [orders]
  );

  useEffect(() => {
    if (orders.length > 0 && storeId) calculatePeriodMetrics(timePeriod);
  }, [timePeriod, storeId, orders.length, calculatePeriodMetrics]);

  // ================== Order Status Counts ==================
  useEffect(() => {
    if (!storeId || orders.length === 0) return;
    const calculateOrderStatus = () => {
      const statusCounts: Record<OrderStatus, number> = {
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };
      orders.forEach((o) => {
        const key = (o.status?.toLowerCase() || "pending") as OrderStatus;
        if (key in statusCounts) statusCounts[key]++;
      });
      setOrderStatusCounts(statusCounts);
    };

    calculateOrderStatus();

    // ================== Sales Trend - Only paid orders ==================
    const days = 30;
    const today = new Date();
    const trendDates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      trendDates.push(d.toISOString().split("T")[0]);
    }

    const trendData = trendDates.map((dateStr) => {
      const daySales = orders
        .filter((o) => o.created_at.split("T")[0] === dateStr && isOrderPaid(o))
        .reduce((sum, o) => sum + o.subtotal, 0);
      return {
        date: new Date(dateStr).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales: daySales,
      };
    });
    setSalesTrend(trendData);

    // ================== Customers - Only paid orders ==================
    const customerMap = new Map<
      string,
      { name: string; total: number; orders: number }
    >();
    orders.forEach((o) => {
      if (!o.customers?.id || !isOrderPaid(o)) return;
      const current = customerMap.get(o.customers.id) || {
        name: o.customers.first_name || "Unknown",
        total: 0,
        orders: 0,
      };
      customerMap.set(o.customers.id, {
        name: current.name,
        total: current.total + o.subtotal,
        orders: current.orders + 1,
      });
    });

    let topCustomer = { name: "No customers", totalSpent: 0 };
    customerMap.forEach((c) => {
      if (c.total > topCustomer.totalSpent)
        topCustomer = { name: c.name, totalSpent: c.total };
    });

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newCustomers = Array.from(customerMap.keys()).filter((id) => {
      const customerOrders = orders.filter(
        (o) => o.customers?.id === id && isOrderPaid(o)
      );
      return (
        customerOrders.length > 0 &&
        new Date(customerOrders[0]?.created_at) > lastWeek
      );
    }).length;

    const totalCustomers = customerMap.size;
    const returningCustomers = Array.from(customerMap.values()).filter(
      (c) => c.orders > 1
    ).length;
    const returningRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    setCustomerSnapshot({
      newCustomers,
      returningRate: parseFloat(returningRate.toFixed(1)),
      topCustomer,
    });

    // ================== Top Products - Only paid orders ==================
    const productMap = new Map<string, { revenue: number; quantity: number }>();
    orders.forEach((order) => {
      if (!isOrderPaid(order)) return;
      order.order_items.forEach((item) => {
        const current = productMap.get(item.product_name) || {
          revenue: 0,
          quantity: 0,
        };
        productMap.set(item.product_name, {
          revenue: current.revenue + item.unit_price * item.quantity,
          quantity: current.quantity + item.quantity,
        });
      });
    });

    const topProductsArray = Array.from(productMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        quantity: data.quantity,
      }));

    setTopProducts(topProductsArray);
  }, [storeId, orders]);

  // ================== Inventory & Alerts ==================
  useEffect(() => {
    if (!storeId) return;

    const fetchInventory = async () => {
      try {
        setLoadingProducts(true);
        const productsFetched = await getProducts(storeId);
        setProducts(productsFetched);

        let lowStock = 0,
          outOfStock = 0;
        productsFetched.forEach((product) => {
          if (product.stock) {
            if ((product.stock.quantity_available ?? 0) === 0) outOfStock++;
            else if (product.is_low_stock) lowStock++;
          }
          product.variants.forEach((variant) => {
            if ((variant.stock.quantity_available ?? 0) === 0) outOfStock++;
            else if (variant.is_low_stock) lowStock++;
          });
        });

        setLowStockCount(lowStock);
        setOutOfStockCount(outOfStock);

        // ================== Alerts ==================
        const alertList: { type: AlertType; message: string; count: number }[] =
          [];
        if (lowStock > 0)
          alertList.push({
            type: "stock",
            message: "Low stock items",
            count: lowStock,
          });
        if (outOfStock > 0)
          alertList.push({
            type: "stock",
            message: "Out of stock items",
            count: outOfStock,
          });

        const pendingOrders = orders.filter(
          (o) => o.status.toLowerCase() === "pending"
        );
        const oldPendingOrders = pendingOrders.filter(
          (o) =>
            (new Date().getTime() - new Date(o.created_at).getTime()) /
              (1000 * 60 * 60) >
            24
        );
        if (oldPendingOrders.length > 0)
          alertList.push({
            type: "order",
            message: "Delayed pending orders",
            count: oldPendingOrders.length,
          });

        // Add unpaid orders alert if needed
        const unpaidOrders = orders.filter((o) => !isOrderPaid(o)).length;
        if (unpaidOrders > 0) {
          alertList.push({
            type: "payment",
            message: "Unpaid orders",
            count: unpaidOrders,
          });
        }

        setAlerts(alertList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchInventory();
  }, [storeId, orders]);

  if (userLoading || ordersLoading || loadingProducts)
    return (
      <div className="text-center mt-20 text-lg">Loading dashboard...</div>
    );
  if (userError) return <div>Error fetching user: {userError.message}</div>;
  if (ordersError) return <div>Error fetching orders: {ordersError}</div>;

  // ================== KPI Stats ==================
  const getChangeType = (
    percentage: number
  ): "positive" | "negative" | "neutral" =>
    percentage > 0 ? "positive" : percentage < 0 ? "negative" : "neutral";

  const getPeriodText = (period: TimePeriod): string => {
    switch (period) {
      case "daily":
        return "Day-over-day";
      case "weekly":
        return "Week-over-week";
      case "monthly":
        return "Month-over-month";
      case "yearly":
        return "Year-over-year";
      default:
        return "";
    }
  };

  const formatChangeText = (percentage: number, period: TimePeriod) => {
    const sign = percentage > 0 ? "+" : "";
    return `${sign}${percentage.toFixed(1)}% ${getPeriodText(period)}`;
  };

  const stats = [
    {
      title: `${
        timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
      } Revenue (Paid)`,
      value: renderCurrency(revenue),
      icon: <DollarOutlined className="text-green-500" />,
      change: formatChangeText(changePercentage.revenue, timePeriod),
      changeType: getChangeType(changePercentage.revenue),
      description: "From paid orders only",
    },
    {
      title: `${
        timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
      } Orders`,
      value: orderCount.toString(),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
      change: formatChangeText(changePercentage.orders, timePeriod),
      changeType: getChangeType(changePercentage.orders),
      description: "All orders (including unpaid)",
    },
    {
      title: `${
        timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
      } Avg Order Value`,
      value: renderCurrency(averageOrderValue),
      icon: <LineChartOutlined className="text-purple-500" />,
      change: formatChangeText(changePercentage.aov, timePeriod),
      changeType: getChangeType(changePercentage.aov),
      description: "Based on paid revenue ÷ total orders",
    },
    {
      title: `${
        timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
      } Gross Profit (Paid)`,
      value: renderCurrency(revenue * 0.6),
      icon: <DollarOutlined className="text-amber-500" />,
      change: formatChangeText(changePercentage.profit, timePeriod),
      changeType: getChangeType(changePercentage.profit),
      description: "From paid orders only (60% margin)",
    },
  ];

  // ... rest of the component remains the same ...
  const orderStatusCards = [
    {
      title: "Pending",
      value: orderStatusCounts.pending.toString(),
      icon: <ExclamationOutlined className="text-amber-500" />,
      color: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      title: "Confirmed",
      value: orderStatusCounts.confirmed.toString(),
      icon: <SyncOutlined className="text-blue-500" />,
      color: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      title: "Shipped",
      value: orderStatusCounts.shipped.toString(),
      icon: <ShoppingCartOutlined className="text-purple-500" />,
      color: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      title: "Delivered",
      value: orderStatusCounts.delivered.toString(),
      icon: <CheckCircleOutlined className="text-green-500" />,
      color: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "Cancelled",
      value: orderStatusCounts.cancelled.toString(),
      icon: <CloseCircleOutlined className="text-red-500" />,
      color: "bg-red-50",
      textColor: "text-red-700",
    },
  ];

  const inStockCount = products.filter(
    (p) => (p.stock?.quantity_available ?? 0) > 0
  ).length;
  const inventoryAlerts = [
    {
      title: "In Stock",
      value: inStockCount.toString(),
      icon: <CheckCircleOutlined />,
      color: "bg-green-100",
      actionText: "View Items",
    },
    {
      title: "Low Stock",
      value: lowStockCount.toString(),
      icon: <ExclamationOutlined />,
      color: "bg-amber-100",
      actionText: "View Items",
    },
    {
      title: "Out of Stock",
      value: outOfStockCount.toString(),
      icon: <CloseCircleOutlined />,
      color: "bg-red-100",
      actionText: "Restock Now",
    },
  ];

  const customerStats = [
    {
      title: "New Customers (7d)",
      value: customerSnapshot.newCustomers.toString(),
      icon: <UserOutlined className="text-blue-500" />,
    },
    {
      title: "Returning Rate",
      value: `${customerSnapshot.returningRate}%`,
      icon: <UserOutlined className="text-green-500" />,
    },
    {
      title: "Top Customer",
      value: customerSnapshot.topCustomer.name,
      subValue: renderCurrency(customerSnapshot.topCustomer.totalSpent),
      icon: <StarOutlined className="text-purple-500" />,
    },
  ];

  return (
    <MainDashboard
      stats={stats}
      orderStatusCards={orderStatusCards}
      orderAmounts={[
        {
          title: "Pending Amount",
          amount: paymentAmounts.pending,
          status: "pending",
        },
        { title: "Paid Amount", amount: paymentAmounts.paid, status: "paid" },
        {
          title: "Refunded Amount",
          amount: paymentAmounts.refunded,
          status: "refunded",
        },
      ]}
      inventoryAlerts={inventoryAlerts}
      salesTrend={salesTrend}
      topProducts={topProducts}
      customerStats={customerStats}
      alerts={alerts}
      timePeriod={timePeriod}
      onTimePeriodChange={setTimePeriod}
    />
  );
}
