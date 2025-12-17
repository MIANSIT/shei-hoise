// app/hooks/useDashboardMetrics.ts
import { useCallback, useEffect, useState } from "react";
import { StoreOrder } from "@/lib/types/order";
import { Product } from "@/lib/queries/products/getProducts";

export type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";
export type AlertType = "stock" | "order" | "payment";

interface OrderItem {
  id: string;
  product_name: string;
  product_id: string;
  variant_id?: string;
  unit_price: number;
  discounted_amount?: number;
  quantity: number;
}

interface ProductVariant {
  id: string;
  variant_name: string;
  base_price: number;
  sale_price?: number;
  stock: {
    quantity_available: number;
    low_stock_threshold?: number;
    is_low_stock: boolean;
  };
  is_low_stock: boolean;
}

type DashboardProduct = Product & { variants: ProductVariant[] };

interface DashboardMetrics {
  revenue: number;
  orderCount: number;

  // AOVs
  averageOrderValue: number; // AOV (All Orders)
  paidAverageOrderValue: number; // AOV (Paid Orders) – calculated but not required in UI

  grossProfit: number;
  changePercentage: {
    revenue: number;
    orders: number;
    aov: number;
    profit: number;
  };
  orderStatusCounts: Record<OrderStatus, number>;
  salesTrend: { date: string; sales: number }[];
  customerSnapshot: {
    newCustomers: number;
    returningRate: number;
    topCustomer: { name: string; totalSpent: number };
  };
  topProducts: {
    name: string;
    revenue: number;
    quantity: number;
    cost: number;
    profit: number;
    profitMargin: number;
  }[];
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  paymentAmounts: Record<PaymentStatus, number>;
  alerts: { type: AlertType; message: string; count: number }[];
  filteredOrders: StoreOrder[];
  paidOrders: StoreOrder[];
}

export const useDashboardMetrics = (
  storeId: string | null,
  orders: StoreOrder[],
  products: DashboardProduct[],
  timePeriod: TimePeriod
) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    revenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    paidAverageOrderValue: 0,
    grossProfit: 0,
    changePercentage: { revenue: 0, orders: 0, aov: 0, profit: 0 },
    orderStatusCounts: {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
    salesTrend: [],
    customerSnapshot: {
      newCustomers: 0,
      returningRate: 0,
      topCustomer: { name: "", totalSpent: 0 },
    },
    topProducts: [],
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
    paymentAmounts: { paid: 0, pending: 0, refunded: 0 },
    alerts: [],
    filteredOrders: [],
    paidOrders: [],
  });

  const isOrderPaid = useCallback(
    (order: StoreOrder) => order.payment_status?.toLowerCase() === "paid",
    []
  );

  const getItemSellingPrice = useCallback(
    (item: OrderItem) => item.discounted_amount ?? item.unit_price,
    []
  );

  const ESTIMATED_COST_PERCENTAGE = 0.6;

  const getItemEstimatedCost = useCallback(
    (item: OrderItem) => getItemSellingPrice(item) * ESTIMATED_COST_PERCENTAGE,
    [getItemSellingPrice]
  );

  const calculateItemProfit = useCallback(
    (item: OrderItem) => getItemSellingPrice(item) - getItemEstimatedCost(item),
    [getItemSellingPrice, getItemEstimatedCost]
  );

  const getCurrentPeriodDates = useCallback((period: TimePeriod) => {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case "daily":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "weekly": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(diff + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case "monthly":
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "yearly":
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    return { start: startDate, end: endDate };
  }, []);

  const getPreviousPeriodDates = useCallback(
    (period: TimePeriod) => {
      const current = getCurrentPeriodDates(period);
      const prevStart = new Date(current.start);
      const prevEnd = new Date(current.end);

      switch (period) {
        case "daily":
          prevStart.setDate(prevStart.getDate() - 1);
          prevEnd.setDate(prevEnd.getDate() - 1);
          break;
        case "weekly":
          prevStart.setDate(prevStart.getDate() - 7);
          prevEnd.setDate(prevEnd.getDate() - 7);
          break;
        case "monthly":
          prevStart.setMonth(prevStart.getMonth() - 1);
          prevEnd.setMonth(prevEnd.getMonth() - 1, 0);
          break;
        case "yearly":
          prevStart.setFullYear(prevStart.getFullYear() - 1);
          prevEnd.setFullYear(prevEnd.getFullYear() - 1);
          break;
      }
      return { start: prevStart, end: prevEnd };
    },
    [getCurrentPeriodDates]
  );

  const calculateAllMetrics = useCallback(() => {
    if (!storeId || orders.length === 0) return;

    const currentPeriod = getCurrentPeriodDates(timePeriod);
    const prevPeriod = getPreviousPeriodDates(timePeriod);

    let revenue = 0;
    let grossProfit = 0;
    let orderCount = 0;
    let paidOrderCount = 0;
    let totalOrderValue = 0; // ALL orders

    let prevRevenue = 0;
    let prevOrderCount = 0;
    let prevProfit = 0;

    const orderStatusCounts: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    const paymentAmounts: Record<PaymentStatus, number> = {
      paid: 0,
      pending: 0,
      refunded: 0,
    };

    const salesTrendMap = new Map<string, number>();
    const topProductsMap = new Map<
      string,
      { revenue: number; quantity: number; cost: number; profit: number }
    >();
    const customerMap = new Map<
      string,
      { name: string; totalSpent: number; orders: number; firstOrderDate: Date }
    >();
    const paidCustomerMap = new Map<
      string,
      { name: string; totalSpent: number }
    >();

    const filteredOrders: StoreOrder[] = [];
    const paidOrders: StoreOrder[] = [];

    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      salesTrendMap.set(d.toDateString(), 0);
    }

    // Process orders - ALL metrics from PAID orders only
    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const subtotal = Number(order.subtotal) || 0;
      const total = Number(order.total_amount) || 0;
      const isPaid = isOrderPaid(order);

      // Filter orders for current period (all orders)
      if (orderDate >= currentPeriod.start && orderDate <= currentPeriod.end) {
        filteredOrders.push(order);
        orderCount++;
        totalOrderValue += subtotal; // 👈 all orders for AOV calculation
      }

      // Calculate metrics for CURRENT PERIOD (PAID orders only)
      if (
        orderDate >= currentPeriod.start &&
        orderDate <= currentPeriod.end &&
        isPaid
      ) {
        revenue += subtotal;
        paidOrders.push(order);
        paidOrderCount++;
      }

      // Calculate metrics for PREVIOUS PERIOD (PAID orders only)
      if (
        orderDate >= prevPeriod.start &&
        orderDate <= prevPeriod.end &&
        isPaid
      ) {
        prevRevenue += subtotal;
        prevOrderCount++;
        prevProfit += (order.order_items as OrderItem[]).reduce(
          (sum, item) => sum + calculateItemProfit(item) * (item.quantity || 1),
          0
        );
      }

      // Count order statuses (all orders)
      const statusKey = (order.status?.toLowerCase() ||
        "pending") as OrderStatus;
      orderStatusCounts[statusKey]++;

      // Count payment amounts (all orders)
      const paymentKey = (order.payment_status?.toLowerCase() ||
        "pending") as PaymentStatus;
      paymentAmounts[paymentKey] += total;

      // Sales trend (PAID orders only)
      if (isPaid) {
        const dayKey = new Date(order.created_at).toDateString();
        if (salesTrendMap.has(dayKey)) {
          salesTrendMap.set(
            dayKey,
            (salesTrendMap.get(dayKey) || 0) + subtotal
          );
        }
      }

      // Customer data (all orders for counting, but paid for spending)
      if (!order.customers?.id) return;
      const customerId = order.customers.id;
      const firstName = order.customers.first_name || "Unknown";

      const currentCustomer = customerMap.get(customerId);
      if (!currentCustomer) {
        customerMap.set(customerId, {
          name: firstName,
          totalSpent: subtotal,
          orders: 1,
          firstOrderDate: orderDate,
        });
      } else {
        customerMap.set(customerId, {
          ...currentCustomer,
          totalSpent: currentCustomer.totalSpent + subtotal,
          orders: currentCustomer.orders + 1,
        });
      }

      // Top customer (PAID orders only)
      if (isPaid) {
        const paidCustomer = paidCustomerMap.get(customerId);
        if (!paidCustomer)
          paidCustomerMap.set(customerId, {
            name: firstName,
            totalSpent: subtotal,
          });
        else
          paidCustomerMap.set(customerId, {
            name: paidCustomer.name,
            totalSpent: paidCustomer.totalSpent + subtotal,
          });
      }

      // Top products (PAID orders only)
      if (isPaid) {
        (order.order_items as OrderItem[]).forEach((item) => {
          const current = topProductsMap.get(item.product_name) || {
            revenue: 0,
            quantity: 0,
            cost: 0,
            profit: 0,
          };
          const qty = item.quantity || 1;
          const itemRevenue = getItemSellingPrice(item) * qty;
          const itemCost = getItemEstimatedCost(item) * qty;
          const itemProfit = itemRevenue - itemCost;

          topProductsMap.set(item.product_name, {
            revenue: current.revenue + itemRevenue,
            quantity: current.quantity + qty,
            cost: current.cost + itemCost,
            profit: current.profit + itemProfit,
          });
        });
      }
    });

    // Calculate gross profit (PAID orders only)
    grossProfit = filteredOrders.reduce((sum, order) => {
      if (!isOrderPaid(order)) return sum;
      return (
        sum +
        (order.order_items as OrderItem[]).reduce(
          (s, item) => s + calculateItemProfit(item) * (item.quantity || 1),
          0
        )
      );
    }, 0);

    // Calculate inventory counts from products
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    // Process products to get stock information
    products.forEach((product) => {
      if (product.variants && product.variants.length > 0) {
        // For products with variants, sum quantities
        product.variants.forEach((variant) => {
          const quantity = variant.stock?.quantity_available ?? 0;
          const lowThreshold = variant.stock?.low_stock_threshold ?? 5;

          if (quantity <= 0) {
            outOfStockCount++;
          } else if (quantity <= lowThreshold) {
            lowStockCount++;
            inStockCount += quantity;
          } else {
            inStockCount += quantity;
          }
        });
      } else {
        // Products without variants
        const quantity =
          product.stock?.quantity_available ?? product.quantity_available ?? 0;
        const lowThreshold =
          product.stock?.low_stock_threshold ??
          product.low_stock_threshold ??
          5;

        if (quantity <= 0) {
          outOfStockCount++;
        } else if (quantity <= lowThreshold) {
          lowStockCount++;
          inStockCount += quantity;
        } else {
          inStockCount += quantity;
        }
      }
    });

    // Calculate customer metrics
    let topCustomer = { name: "No customers", totalSpent: 0 };
    paidCustomerMap.forEach((c) => {
      if (c.totalSpent > topCustomer.totalSpent) topCustomer = { ...c };
    });

    const newCustomers = Array.from(customerMap.values()).filter(
      (c) =>
        c.firstOrderDate >= currentPeriod.start &&
        c.firstOrderDate <= currentPeriod.end
    ).length;

    const totalCustomers = customerMap.size;
    const returningCustomers = Array.from(customerMap.values()).filter(
      (c) => c.orders > 1
    ).length;
    const returningRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // Prepare top products (from PAID orders only)
    const topProducts = Array.from(topProductsMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        ...data,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }));

    // Prepare sales trend data (from PAID orders only)
    const salesTrend = Array.from(salesTrendMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, sales]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales,
      }));

    // Calculate alerts
    const alerts: { type: AlertType; message: string; count: number }[] = [];

    if (lowStockCount > 0) {
      alerts.push({
        type: "stock",
        message: `Low stock items need attention`,
        count: lowStockCount,
      });
    }

    if (outOfStockCount > 0) {
      alerts.push({
        type: "stock",
        message: `Out of stock items detected`,
        count: outOfStockCount,
      });
    }

    // Add order alerts if there are pending orders
    if (orderStatusCounts.pending > 0) {
      alerts.push({
        type: "order",
        message: `Pending orders require action`,
        count: orderStatusCounts.pending,
      });
    }

    // Add payment alerts if there are pending payments
    if (paymentAmounts.pending > 0) {
      alerts.push({
        type: "payment",
        message: `Pending payments awaiting confirmation`,
        count: 1, // Count as 1 alert instance, not number of orders
      });
    }

    // Calculate change percentages
    const calculateChange = (current: number, previous: number) =>
      previous === 0
        ? current > 0
          ? 100
          : 0
        : ((current - previous) / previous) * 100;

    // Set all metrics
    setMetrics({
      revenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? totalOrderValue / orderCount : 0,
      paidAverageOrderValue: paidOrderCount > 0 ? revenue / paidOrderCount : 0,
      grossProfit,
      changePercentage: {
        revenue: calculateChange(revenue, prevRevenue),
        orders: calculateChange(orderCount, prevOrderCount),
        aov: calculateChange(
          orderCount > 0 ? totalOrderValue / orderCount : 0,
          prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0
        ),
        profit: calculateChange(grossProfit, prevProfit),
      },
      orderStatusCounts,
      salesTrend,
      customerSnapshot: {
        newCustomers,
        returningRate: parseFloat(returningRate.toFixed(1)),
        topCustomer,
      },
      topProducts,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      paymentAmounts,
      alerts,
      filteredOrders,
      paidOrders,
    });
  }, [
    storeId,
    orders,
    products,
    timePeriod,
    getCurrentPeriodDates,
    getPreviousPeriodDates,
    isOrderPaid,
    calculateItemProfit,
    getItemSellingPrice,
    getItemEstimatedCost,
  ]);

  useEffect(() => {
    calculateAllMetrics();
  }, [calculateAllMetrics]);

  return metrics;
};
