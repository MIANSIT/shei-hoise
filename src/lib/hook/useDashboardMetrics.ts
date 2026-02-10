// app/hooks/useDashboardMetrics.ts
import { useCallback, useEffect, useState } from "react";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { Product } from "@/lib/queries/products/getProducts";

export type TimePeriod = "weekly" | "monthly" | "yearly";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";
export type AlertType = "stock" | "order" | "payment";

interface ProductVariant {
  id: string;
  variant_name: string;
  base_price: number;
  sale_price?: number;
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

interface DashboardMetrics {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  paidAverageOrderValue: number;
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
  inStockCount: number; // total units in stock
  lowStockCount: number; // total units low in stock
  outOfStockCount: number; // total variants/products out of stock
  lowStockProductCount: number; // products with at least 1 low stock variant
  outOfStockProductCount: number; // products fully out of stock
  totalInventoryValue: number; // total value of all inventory (tp_price * quantity)
  paymentAmounts: Record<PaymentStatus, number>;
  alerts: { type: AlertType; message: string; count: number }[];
  filteredOrders: StoreOrder[];
  paidOrders: StoreOrder[];
}

export const useDashboardMetrics = (
  storeId: string | null,
  orders: StoreOrder[],
  products: DashboardProduct[],
  timePeriod: TimePeriod,
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
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockProductCount: 0,
    outOfStockProductCount: 0,
    totalInventoryValue: 0,
    paymentAmounts: { paid: 0, pending: 0, refunded: 0 },
    alerts: [],
    filteredOrders: [],
    paidOrders: [],
  });

  const isOrderPaid = useCallback(
    (order: StoreOrder) => order.payment_status?.toLowerCase() === "paid",
    [],
  );

  const getItemSellingPrice = useCallback(
    (item: OrderItem) => item.discounted_amount ?? item.unit_price,
    [],
  );

  const getItemCost = useCallback(
    (item: OrderItem) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return 0;
      if (item.variant_id != null) {
        const variant = product.variants?.find((v) => v.id === item.variant_id);
        if (variant?.tp_price != null) return variant.tp_price;
      }
      return product.tp_price ?? 0;
    },
    [products],
  );

  const calculateItemProfit = useCallback(
    (item: OrderItem) => getItemSellingPrice(item) - getItemCost(item),
    [getItemSellingPrice, getItemCost],
  );

  const getCurrentPeriodDates = useCallback((period: TimePeriod) => {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
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
    [getCurrentPeriodDates],
  );

  const calculateAllMetrics = useCallback(() => {
    if (!storeId) return;

    const currentPeriod = getCurrentPeriodDates(timePeriod);
    const prevPeriod = getPreviousPeriodDates(timePeriod);

    let revenue = 0,
      grossProfit = 0,
      orderCount = 0,
      paidOrderCount = 0,
      totalOrderValue = 0;

    let prevRevenue = 0,
      prevOrderCount = 0,
      prevProfit = 0;

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

    // Initialize sales trend for last 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      salesTrendMap.set(d.toDateString(), 0);
    }

    // Orders processing
    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const subtotal = Number(order.subtotal) || 0;
      const total = Number(order.total_amount) || 0;
      const isPaid = isOrderPaid(order);

      // Filter current period orders
      if (orderDate >= currentPeriod.start && orderDate <= currentPeriod.end) {
        filteredOrders.push(order);
        orderCount++;
        totalOrderValue += subtotal;
      }

      // Metrics for paid orders (current period)
      if (
        orderDate >= currentPeriod.start &&
        orderDate <= currentPeriod.end &&
        isPaid
      ) {
        revenue += subtotal;
        paidOrders.push(order);
        paidOrderCount++;
      }

      // Metrics for previous period (paid)
      if (
        orderDate >= prevPeriod.start &&
        orderDate <= prevPeriod.end &&
        isPaid
      ) {
        prevRevenue += subtotal;
        prevOrderCount++;
        prevProfit += (order.order_items as OrderItem[]).reduce(
          (sum, item) => sum + calculateItemProfit(item) * (item.quantity || 1),
          0,
        );
      }

      // Order status counts
      const statusKey = (order.status?.toLowerCase() ||
        "pending") as OrderStatus;
      orderStatusCounts[statusKey]++;

      // Payment amounts
      const paymentKey = (order.payment_status?.toLowerCase() ||
        "pending") as PaymentStatus;
      paymentAmounts[paymentKey] += total;

      // Sales trend (paid only)
      if (isPaid) {
        const dayKey = new Date(order.created_at).toDateString();
        if (salesTrendMap.has(dayKey)) {
          salesTrendMap.set(
            dayKey,
            (salesTrendMap.get(dayKey) || 0) + subtotal,
          );
        }
      }

      // Customers
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

      // Top products (paid)
      if (isPaid) {
        (order.order_items as OrderItem[]).forEach((item) => {
          const current = topProductsMap.get(item.product_name) || {
            revenue: 0,
            quantity: 0,
            cost: 0,
            profit: 0,
          };
          const qty = item.quantity || 1;
          const sell = getItemSellingPrice(item);
          const cost = getItemCost(item);
          const itemRevenue = sell * qty;
          const itemCost = cost * qty;
          const itemProfit = (sell - cost) * qty;

          topProductsMap.set(item.product_name, {
            revenue: current.revenue + itemRevenue,
            quantity: current.quantity + qty,
            cost: current.cost + itemCost,
            profit: current.profit + itemProfit,
          });
        });
      }
    });

    // Gross profit (paid orders)
    grossProfit = filteredOrders.reduce((sum, order) => {
      if (!isOrderPaid(order)) return sum;
      return (
        sum +
        order.order_items.reduce(
          (s, item) => s + calculateItemProfit(item) * (item.quantity || 1),
          0,
        )
      );
    }, 0);

    // ========================
    // Inventory metrics
    // ========================
    let inStockCount = 0; // total units in stock
    let lowStockCount = 0; // total units low in stock
    let outOfStockCount = 0; // total variants/products out of stock (units = 0)
    let lowStockProductCount = 0; // products with at least 1 low stock variant
    let outOfStockProductCount = 0; // products fully out of stock
    let totalInventoryValue = 0; // NEW: total inventory value

    products.forEach((product) => {
      let productHasStock = false; // does this product have any stock?
      let productHasLowStock = false; // does this product have low stock?

      const variants =
        product.variants?.length > 0 ? product.variants : [product];

      variants.forEach((variant) => {
        const stock = variant.stock;
        if (!stock || !stock.track_inventory) return;

        const qty = stock.quantity_available ?? 0;
        const threshold = stock.low_stock_threshold ?? 0;
        const tpPrice = variant.tp_price ?? 0;

        if (qty > 0) {
          inStockCount += qty; // total units in stock
          productHasStock = true;

          // Calculate inventory value: quantity × tp_price
          totalInventoryValue += qty * tpPrice;

          if (qty <= threshold) {
            lowStockCount += qty; // total low-stock units
            productHasLowStock = true; // mark product as low stock
          }
        } else {
          outOfStockCount++; // count out-of-stock variants
        }
      });

      // Product-level counts
      if (!productHasStock) outOfStockProductCount++;
      else if (productHasLowStock) lowStockProductCount++;
    });

    // Customer snapshot
    let topCustomer = { name: "No customers", totalSpent: 0 };
    paidCustomerMap.forEach((c) => {
      if (c.totalSpent > topCustomer.totalSpent) topCustomer = c;
    });
    const newCustomers = Array.from(customerMap.values()).filter(
      (c) =>
        c.firstOrderDate >= currentPeriod.start &&
        c.firstOrderDate <= currentPeriod.end,
    ).length;
    const totalCustomers = customerMap.size;
    const returningCustomers = Array.from(customerMap.values()).filter(
      (c) => c.orders > 1,
    ).length;
    const returningRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // Prepare top products
    const topProducts = Array.from(topProductsMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        ...data,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }));

    // Sales trend
    const salesTrend = Array.from(salesTrendMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, sales]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales,
      }));

    // Alerts
    const alerts: { type: AlertType; message: string; count: number }[] = [];
    if (lowStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: `Low stock products need attention`,
        count: lowStockProductCount,
      });
    if (outOfStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: `Out of stock products detected`,
        count: outOfStockProductCount,
      });
    if (orderStatusCounts.pending > 0)
      alerts.push({
        type: "order",
        message: `Pending orders require action`,
        count: orderStatusCounts.pending,
      });
    if (paymentAmounts.pending > 0)
      alerts.push({
        type: "payment",
        message: `Pending payments awaiting confirmation`,
        count: 1,
      });

    const calculateChange = (current: number, previous: number) =>
      previous === 0
        ? current > 0
          ? 100
          : 0
        : ((current - previous) / previous) * 100;

    // Set final metrics
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
          prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0,
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
      inStockCount,
      lowStockCount,
      outOfStockCount,
      lowStockProductCount,
      outOfStockProductCount,
      totalInventoryValue, // NEW: total inventory value
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
    getItemCost,
  ]);

  useEffect(() => {
    calculateAllMetrics();
  }, [calculateAllMetrics]);

  return metrics;
};
