"use client";

import React, { useEffect, useState } from "react";
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

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function DashboardPage() {
  const { storeId, loading: userLoading, error: userError } = useCurrentUser();
  const {
    orders,
    totalAmount,
    loading: ordersLoading,
    error: ordersError,
  } = useStoreOrders(storeId || "");

  // State for time period selection
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("daily");
  const [products, setProducts] = useState<Product[]>([]);
  // State for dashboard metrics
  const [revenue, setRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [orderStatusCounts, setOrderStatusCounts] = useState({
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
    { type: "stock" | "order" | "payment"; message: string; count: number }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [changePercentage, setChangePercentage] = useState({
    revenue: 0,
    orders: 0,
    aov: 0,
    profit: 0,
  });

  const pendingAmount = orders
    .filter((o) => o.status.toLowerCase() === "pending")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const paidAmount = orders
    .filter((o) => o.status.toLowerCase() === "delivered")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const refundedAmount = orders
    .filter((o) => o.status.toLowerCase() === "refunded")
    .reduce((sum, o) => sum + o.total_amount, 0);

  // Filter orders based on selected time period
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
  // Calculate metrics for current period
  const calculatePeriodMetrics = React.useCallback(
    (period: TimePeriod) => {
      const filteredOrders = filterOrdersByPeriod(orders, period);

      const currentRevenue = filteredOrders.reduce(
        (sum, order) => sum + order.total_amount,
        0
      );
      const currentOrderCount = filteredOrders.length;
      const currentAOV =
        currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
      const currentProfit = currentRevenue * 0.6;

      setRevenue(currentRevenue);
      setOrderCount(currentOrderCount);
      setAverageOrderValue(currentAOV);

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

      const prevPeriodOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= prevStart && orderDate <= prevEnd;
      });

      const prevRevenue = prevPeriodOrders.reduce(
        (sum, order) => sum + order.total_amount,
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

  // Update metrics when timePeriod changes
  useEffect(() => {
    if (orders.length > 0 && storeId) {
      calculatePeriodMetrics(timePeriod);
    }
  }, [timePeriod, storeId, calculatePeriodMetrics, orders.length]);

  useEffect(() => {
    if (!storeId || orders.length === 0) return;

    const calculateOrderStatus = () => {
      const statusCounts = {
        pending: orders.filter((o) => o.status.toLowerCase() === "pending")
          .length,
        confirmed: orders.filter((o) => o.status.toLowerCase() === "confirmed")
          .length,
        shipped: orders.filter((o) => o.status.toLowerCase() === "shipped")
          .length,
        delivered: orders.filter((o) => o.status.toLowerCase() === "delivered")
          .length,
        cancelled: orders.filter((o) => o.status.toLowerCase() === "cancelled")
          .length,
      };
      setOrderStatusCounts(statusCounts);
    };

    const calculateSalesTrend = () => {
      if (!orders.length) return;

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
          .filter((order) => order.created_at.split("T")[0] === dateStr)
          .reduce((sum, order) => sum + order.total_amount, 0);

        return {
          date: new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          sales: daySales,
        };
      });

      setSalesTrend(trendData);
    };

    const calculateCustomerMetrics = () => {
      const customerMap = new Map();
      orders.forEach((order) => {
        if (order.customers?.id) {
          const current = customerMap.get(order.customers.id) || {
            name: order.customers.first_name || "Unknown",
            total: 0,
            orders: 0,
          };
          customerMap.set(order.customers.id, {
            name: current.name,
            total: current.total + order.total_amount,
            orders: current.orders + 1,
          });
        }
      });

      let topCustomer = { name: "No customers", totalSpent: 0 };
      customerMap.forEach((customer) => {
        if (customer.total > topCustomer.totalSpent) {
          topCustomer = { name: customer.name, totalSpent: customer.total };
        }
      });

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const newCustomers = Array.from(customerMap.keys()).filter((id) => {
        const customerOrders = orders.filter((o) => o.customers?.id === id);
        const firstOrderDate = customerOrders[0]?.created_at;
        return firstOrderDate && new Date(firstOrderDate) > lastWeek;
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
    };

    const calculateTopProducts = () => {
      const productMap = new Map();
      orders.forEach((order) => {
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
    };

    calculateOrderStatus();
    calculateSalesTrend();
    calculateCustomerMetrics();
    calculateTopProducts();
  }, [storeId, orders, totalAmount]);

  useEffect(() => {
    if (!storeId) return;

    const fetchInventory = async () => {
      try {
        setLoadingProducts(true);
        const productsFetched: Product[] = await getProducts(storeId);

        setProducts(productsFetched); // ← use setProducts here

        let lowStock = 0;
        let outOfStock = 0;

        productsFetched.forEach((product) => {
          if (product.stock) {
            if ((product.stock.quantity_available ?? 0) === 0) {
              outOfStock++;
            } else if (product.is_low_stock) {
              lowStock++;
            }
          }
          product.variants.forEach((variant) => {
            if ((variant.stock.quantity_available ?? 0) === 0) {
              outOfStock++;
            } else if (variant.is_low_stock) {
              lowStock++;
            }
          });
        });

        setLowStockCount(lowStock);
        setOutOfStockCount(outOfStock);

        const alertList = [];
        if (lowStock > 0) {
          alertList.push({
            type: "stock" as const,
            message: "Low stock items",
            count: lowStock,
          });
        }
        if (outOfStock > 0) {
          alertList.push({
            type: "stock" as const,
            message: "Out of stock items",
            count: outOfStock,
          });
        }

        const pendingOrders = orders.filter(
          (o) => o.status.toLowerCase() === "pending"
        );
        const oldPendingOrders = pendingOrders.filter((o) => {
          const orderDate = new Date(o.created_at);
          const now = new Date();
          const hoursDiff =
            (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
          return hoursDiff > 24;
        });

        if (oldPendingOrders.length > 0) {
          alertList.push({
            type: "order" as const,
            message: "Delayed pending orders",
            count: oldPendingOrders.length,
          });
        }

        setAlerts(alertList);
      } catch (err) {
        console.error("Error fetching products:", err);
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

  const getChangeType = (
    percentage: number
  ): "positive" | "negative" | "neutral" => {
    if (percentage > 0) return "positive";
    if (percentage < 0) return "negative";
    return "neutral";
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage > 0 ? "+" : "";
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const getPeriodText = (period: TimePeriod) => {
    switch (period) {
      case "daily":
        return "yesterday";
      case "weekly":
        return "last week";
      case "monthly":
        return "last month";
      case "yearly":
        return "last year";
    }
  };

  // KPI Stats
  const stats = [
    {
      title: `${
        timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
      } Revenue`,
      value: `BDT ${revenue.toFixed(2)}`,
      icon: <DollarOutlined className="text-green-500" />,
      change: `${formatPercentage(
        changePercentage.revenue
      )} from ${getPeriodText(timePeriod)}`,
      changeType: getChangeType(changePercentage.revenue),
    },
    {
      title: `${
        timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)
      } Orders`,
      value: orderCount.toString(),
      icon: <ShoppingCartOutlined className="text-blue-500" />,
      change: `${formatPercentage(
        changePercentage.orders
      )} from ${getPeriodText(timePeriod)}`,
      changeType: getChangeType(changePercentage.orders),
    },
    {
      title: "Avg Order Value",
      value: `BDT ${averageOrderValue.toFixed(2)}`,
      icon: <LineChartOutlined className="text-purple-500" />,
      change: `${formatPercentage(changePercentage.aov)} from ${getPeriodText(
        timePeriod
      )}`,
      changeType: getChangeType(changePercentage.aov),
    },
    {
      title: "Gross Profit",
      value: `BDT ${(revenue * 0.6).toFixed(2)}`,
      icon: <DollarOutlined className="text-amber-500" />,
      change: `${formatPercentage(
        changePercentage.profit
      )} from ${getPeriodText(timePeriod)}`,
      changeType: getChangeType(changePercentage.profit),
    },
  ];

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
      subValue: `BDT ${customerSnapshot.topCustomer.totalSpent.toFixed(
        2
      )} spent`,
      icon: <StarOutlined className="text-purple-500" />,
    },
  ];

  return (
    <MainDashboard
      stats={stats}
      orderStatusCards={orderStatusCards}
      orderAmounts={[
        { title: "Pending Amount", amount: pendingAmount, status: "pending" },
        { title: "Paid Amount", amount: paidAmount, status: "paid" },
        {
          title: "Refunded Amount",
          amount: refundedAmount,
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
