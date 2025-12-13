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

// Define proper types for order items
interface OrderItem {
  id: string;
  product_name: string;
  product_id: string;
  variant_id?: string;
  unit_price: number;
  discounted_amount?: number;
  quantity: number;
  cost_price?: number;
  profit_margin?: number;
  products?: {
    name: string;
    base_price: number;
    sale_price?: number;
    cost_price?: number;
    profit_margin?: number;
  };
  product_variants?: {
    variant_name: string;
    base_price: number;
    sale_price?: number;
    cost_price?: number;
    profit_margin?: number;
  };
}

// Define proper types that match your actual Product structure
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

// Use intersection type instead of Omit to preserve the original Product type
type DashboardProduct = Product & {
  variants: ProductVariant[];
};

interface DashboardMetrics {
  // Core metrics
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  grossProfit: number;
  changePercentage: {
    revenue: number;
    orders: number;
    aov: number;
    profit: number;
  };

  // Order status
  orderStatusCounts: Record<OrderStatus, number>;

  // Sales trend
  salesTrend: { date: string; sales: number }[];

  // Customer analytics
  customerSnapshot: {
    newCustomers: number;
    returningRate: number;
    topCustomer: { name: string; totalSpent: number };
  };

  // Top products
  topProducts: {
    name: string;
    revenue: number;
    quantity: number;
    profit: number;
    cost: number;
    profitMargin: number;
  }[];

  // Inventory
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;

  // Payment amounts
  paymentAmounts: Record<PaymentStatus, number>;

  // Alerts
  alerts: { type: AlertType; message: string; count: number }[];

  // Time period data
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

  // Helper: Check if order is paid
  const isOrderPaid = useCallback((order: StoreOrder): boolean => {
    return order.payment_status?.toLowerCase() === "paid";
  }, []);

  // Helper: Get the correct cost price for an item
  const getItemCostPrice = useCallback((item: OrderItem): number => {
    // Priority 1: Item-level cost_price (most specific)
    if (item.cost_price && !isNaN(item.cost_price)) {
      return item.cost_price;
    }

    // Priority 2: Variant-level cost_price
    if (
      item.variant_id &&
      item.product_variants?.cost_price &&
      !isNaN(item.product_variants.cost_price)
    ) {
      return item.product_variants.cost_price;
    }

    // Priority 3: Product-level cost_price
    if (item.products?.cost_price && !isNaN(item.products.cost_price)) {
      return item.products.cost_price;
    }

    // Priority 4: Calculate from profit_margin if available
    const sellingPrice = item.discounted_amount || item.unit_price;

    // Try item-level profit_margin first
    if (item.profit_margin && !isNaN(item.profit_margin)) {
      return sellingPrice * (1 - item.profit_margin / 100);
    }

    // Try variant-level profit_margin
    if (
      item.variant_id &&
      item.product_variants?.profit_margin &&
      !isNaN(item.product_variants.profit_margin)
    ) {
      return sellingPrice * (1 - item.product_variants.profit_margin / 100);
    }

    // Try product-level profit_margin
    if (item.products?.profit_margin && !isNaN(item.products.profit_margin)) {
      return sellingPrice * (1 - item.products.profit_margin / 100);
    }

    // If no cost data is available, return 0 to avoid incorrect profit calculations
    console.warn(`No cost data available for item: ${item.product_name}`);
    return 0;
  }, []);

  // Helper: Calculate profit for an order item
  const calculateItemProfit = useCallback(
    (item: OrderItem): number => {
      const sellingPrice = item.discounted_amount || item.unit_price;
      const costPrice = getItemCostPrice(item);

      if (costPrice === 0) {
        // If we have no cost data, we cannot calculate profit accurately
        // Return 0 profit to avoid showing incorrect data
        return 0;
      }

      return sellingPrice - costPrice;
    },
    [getItemCostPrice]
  );

  // ================== TIME PERIOD LOGIC ==================
  // Based on your question about sales/financial reports:
  // Option 1: Daily = Yesterday, Monthly = Last Month (for financial reports)
  // Option 2: Daily = Today, Monthly = This Month (for dashboard)

  // I'll implement OPTION 1 for financial reporting:
  // Daily = Yesterday vs Day Before Yesterday
  // Weekly = Last Week vs Week Before Last
  // Monthly = Last Month vs Month Before Last
  // Yearly = Last Year vs Year Before Last

  // Helper: Get period dates for financial reporting (OPTION 1)
  const getPeriodDates = useCallback(
    (period: TimePeriod): { start: Date; end: Date } => {
      const now = new Date();
      const startDate = new Date();
      const endDate = new Date();

      switch (period) {
        case "daily":
          // YESTERDAY (for financial reports)
          startDate.setDate(now.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(now.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "weekly":
          // LAST WEEK (Monday to Sunday)
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7; // Start of last week
          startDate.setDate(diff);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(diff + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "monthly":
          // LAST MONTH
          startDate.setMonth(now.getMonth() - 1, 1); // 1st of last month
          startDate.setHours(0, 0, 0, 0);
          endDate.setMonth(now.getMonth(), 0); // Last day of last month
          endDate.setHours(23, 59, 59, 999);
          break;
        case "yearly":
          // LAST YEAR
          startDate.setFullYear(now.getFullYear() - 1, 0, 1); // Jan 1 of last year
          startDate.setHours(0, 0, 0, 0);
          endDate.setFullYear(now.getFullYear() - 1, 11, 31); // Dec 31 of last year
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      return { start: startDate, end: endDate };
    },
    []
  );

  // Helper: Get previous period dates for comparison
  const getPreviousPeriodDates = useCallback(
    (period: TimePeriod): { start: Date; end: Date } => {
      const now = new Date();
      const prevStart = new Date();
      const prevEnd = new Date();

      switch (period) {
        case "daily":
          // DAY BEFORE YESTERDAY
          prevStart.setDate(now.getDate() - 2);
          prevStart.setHours(0, 0, 0, 0);
          prevEnd.setDate(now.getDate() - 2);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        case "weekly":
          // WEEK BEFORE LAST
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 14; // Start of week before last
          prevStart.setDate(diff);
          prevStart.setHours(0, 0, 0, 0);
          prevEnd.setDate(diff + 6);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        case "monthly":
          // MONTH BEFORE LAST
          prevStart.setMonth(now.getMonth() - 2, 1);
          prevStart.setHours(0, 0, 0, 0);
          prevEnd.setMonth(now.getMonth() - 1, 0);
          prevEnd.setHours(23, 59, 59, 999);
          break;
        case "yearly":
          // YEAR BEFORE LAST
          prevStart.setFullYear(now.getFullYear() - 2, 0, 1);
          prevStart.setHours(0, 0, 0, 0);
          prevEnd.setFullYear(now.getFullYear() - 2, 11, 31);
          prevEnd.setHours(23, 59, 59, 999);
          break;
      }

      return { start: prevStart, end: prevEnd };
    },
    []
  );

  // Alternative: For dashboard (OPTION 2) if you want current periods:
  //   const getCurrentPeriodDates = useCallback(
  //     (period: TimePeriod): { start: Date; end: Date } => {
  //       const now = new Date();
  //       const startDate = new Date();
  //       const endDate = new Date();

  //       switch (period) {
  //         case "daily":
  //           // TODAY
  //           startDate.setHours(0, 0, 0, 0);
  //           endDate.setHours(23, 59, 59, 999);
  //           break;
  //         case "weekly":
  //           // THIS WEEK
  //           const day = now.getDay();
  //           const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  //           startDate.setDate(diff);
  //           startDate.setHours(0, 0, 0, 0);
  //           endDate.setDate(diff + 6);
  //           endDate.setHours(23, 59, 59, 999);
  //           break;
  //         case "monthly":
  //           // THIS MONTH
  //           startDate.setDate(1);
  //           startDate.setHours(0, 0, 0, 0);
  //           endDate.setMonth(endDate.getMonth() + 1, 0);
  //           endDate.setHours(23, 59, 59, 999);
  //           break;
  //         case "yearly":
  //           // THIS YEAR
  //           startDate.setMonth(0, 1);
  //           startDate.setHours(0, 0, 0, 0);
  //           endDate.setMonth(11, 31);
  //           endDate.setHours(23, 59, 59, 999);
  //           break;
  //       }

  //       return { start: startDate, end: endDate };
  //     },
  //     []
  //   );

  // Helper: Filter orders by time period
  const filterOrdersByPeriod = useCallback(
    (ordersList: StoreOrder[], period: TimePeriod): StoreOrder[] => {
      const { start, end } = getPeriodDates(period);

      return ordersList.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= start && orderDate <= end;
      });
    },
    [getPeriodDates]
  );

  // Helper: Get available quantity for a product
  const getProductAvailableQuantity = useCallback(
    (product: DashboardProduct): number => {
      return product.stock?.quantity_available ?? 0;
    },
    []
  );

  // Helper: Get available quantity for a variant
  const getVariantAvailableQuantity = useCallback(
    (variant: ProductVariant): number => {
      return variant.stock.quantity_available ?? 0;
    },
    []
  );

  // Helper: Check if variant is low stock
  const isVariantLowStock = useCallback((variant: ProductVariant): boolean => {
    return variant.is_low_stock || false;
  }, []);

  // Helper: Check if product is low stock
  const isProductLowStock = useCallback(
    (product: DashboardProduct): boolean => {
      return product.is_low_stock || false;
    },
    []
  );

  // Main calculation function
  const calculateAllMetrics = useCallback(() => {
    if (!storeId || orders.length === 0) return;

    // 1. Filter orders for current period
    const filteredOrders = filterOrdersByPeriod(orders, timePeriod);
    const paidOrders = filteredOrders.filter(isOrderPaid);

    // 2. Calculate revenue from total_amount
    const currentRevenue = paidOrders.reduce(
      (sum, order) => sum + (Number(order.total_amount) || 0),
      0
    );

    // 3. Calculate profit using actual item costs
    const currentProfit = paidOrders.reduce((sum, order) => {
      const orderProfit = (order.order_items as unknown as OrderItem[]).reduce(
        (itemSum, item) => {
          const quantity = item.quantity || 1;
          return itemSum + calculateItemProfit(item) * quantity;
        },
        0
      );
      return sum + orderProfit;
    }, 0);

    // const paidOrderCount = paidOrders.length;

    // const paidAOV = paidOrderCount > 0 ? currentRevenue / paidOrderCount : 0;

    const currentOrderCount = filteredOrders.length;
    const allOrdersRevenue = filteredOrders.reduce(
      (sum, order) => sum + (Number(order.subtotal) || 0),
      0
    );
    const currentAOV =
      filteredOrders.length > 0 ? allOrdersRevenue / filteredOrders.length : 0;
    // 4. Calculate previous period metrics for comparison
    const prevPeriod = getPreviousPeriodDates(timePeriod);
    const prevPeriodOrders = orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= prevPeriod.start && orderDate <= prevPeriod.end;
    });
    const prevPeriodPaidOrders = prevPeriodOrders.filter(isOrderPaid);

    const prevRevenue = prevPeriodPaidOrders.reduce(
      (sum, order) => sum + (Number(order.total_amount) || 0),
      0
    );
    const prevOrderCount = prevPeriodOrders.length;
    const prevAOV = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;
    const prevProfit = prevPeriodPaidOrders.reduce((sum, order) => {
      const orderProfit = (order.order_items as unknown as OrderItem[]).reduce(
        (itemSum, item) => {
          const quantity = item.quantity || 1;
          return itemSum + calculateItemProfit(item) * quantity;
        },
        0
      );
      return sum + orderProfit;
    }, 0);

    // 5. Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // 6. Order status counts (for ALL orders)
    const orderStatusCounts: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      const key = (order.status?.toLowerCase() || "pending") as OrderStatus;
      if (key in orderStatusCounts) orderStatusCounts[key]++;
    });

    // 7. Sales trend (Last 30 days, paid orders only)
    const days = 30;
    const today = new Date();
    const salesTrend = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const daySales = orders
        .filter((order) => {
          const orderDate = new Date(order.created_at);
          return orderDate >= d && orderDate <= endOfDay && isOrderPaid(order);
        })
        .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

      salesTrend.push({
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales: daySales,
      });
    }

    // 8. Customer analytics
    const customerMap = new Map<
      string,
      { name: string; totalSpent: number; orders: number; firstOrderDate: Date }
    >();

    orders.forEach((order) => {
      if (!order.customers?.id) return;

      const customerId = order.customers.id;
      const orderDate = new Date(order.created_at);
      const current = customerMap.get(customerId);

      if (!current) {
        customerMap.set(customerId, {
          name: order.customers.first_name || "Unknown",
          totalSpent: Number(order.total_amount) || 0,
          orders: 1,
          firstOrderDate: orderDate,
        });
      } else {
        customerMap.set(customerId, {
          name: current.name,
          totalSpent: current.totalSpent + (Number(order.total_amount) || 0),
          orders: current.orders + 1,
          firstOrderDate:
            current.firstOrderDate < orderDate
              ? current.firstOrderDate
              : orderDate,
        });
      }
    });

    // Find top customer
    let topCustomer = { name: "No customers", totalSpent: 0 };
    customerMap.forEach((customer) => {
      if (customer.totalSpent > topCustomer.totalSpent) {
        topCustomer = { name: customer.name, totalSpent: customer.totalSpent };
      }
    });

    // Calculate new customers (first order in last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const newCustomers = Array.from(customerMap.values()).filter(
      (customer) => customer.firstOrderDate > lastWeek
    ).length;

    const totalCustomers = customerMap.size;
    const returningCustomers = Array.from(customerMap.values()).filter(
      (customer) => customer.orders > 1
    ).length;
    const returningRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // 9. Top products
    const productMap = new Map<
      string,
      {
        revenue: number;
        quantity: number;
        cost: number;
        profit: number;
      }
    >();

    paidOrders.forEach((order) => {
      (order.order_items as unknown as OrderItem[]).forEach((item) => {
        const current = productMap.get(item.product_name) || {
          revenue: 0,
          quantity: 0,
          cost: 0,
          profit: 0,
        };

        const itemQuantity = item.quantity || 1;
        const itemRevenue =
          (item.discounted_amount || item.unit_price) * itemQuantity;
        const itemCost = getItemCostPrice(item) * itemQuantity;
        const itemProfit = calculateItemProfit(item) * itemQuantity;

        productMap.set(item.product_name, {
          revenue: current.revenue + itemRevenue,
          quantity: current.quantity + itemQuantity,
          cost: current.cost + itemCost,
          profit: current.profit + itemProfit,
        });
      });
    });

    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        quantity: data.quantity,
        cost: data.cost,
        profit: data.profit,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }));

    // 10. Payment amounts
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

    // 11. Inventory counts
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    products.forEach((product: DashboardProduct) => {
      const productQuantity = getProductAvailableQuantity(product);

      if (productQuantity === 0) {
        const hasVariantStock = product.variants.some(
          (variant: ProductVariant) => getVariantAvailableQuantity(variant) > 0
        );

        if (hasVariantStock) {
          inStockCount++;
        } else {
          outOfStockCount++;
        }
      } else {
        inStockCount++;
        if (isProductLowStock(product)) lowStockCount++;
      }

      product.variants.forEach((variant: ProductVariant) => {
        const variantQuantity = getVariantAvailableQuantity(variant);
        if (variantQuantity === 0) {
          outOfStockCount++;
        } else if (isVariantLowStock(variant)) {
          lowStockCount++;
        }
      });
    });

    // 12. Alerts
    const alerts: { type: AlertType; message: string; count: number }[] = [];

    if (lowStockCount > 0) {
      alerts.push({
        type: "stock",
        message: "Low stock items",
        count: lowStockCount,
      });
    }

    if (outOfStockCount > 0) {
      alerts.push({
        type: "stock",
        message: "Out of stock items",
        count: outOfStockCount,
      });
    }

    const pendingOrders = orders.filter(
      (order) => order.status.toLowerCase() === "pending"
    );

    const oldPendingOrders = pendingOrders.filter((order) => {
      const orderAgeHours =
        (new Date().getTime() - new Date(order.created_at).getTime()) /
        (1000 * 60 * 60);
      return orderAgeHours > 24;
    });

    if (oldPendingOrders.length > 0) {
      alerts.push({
        type: "order",
        message: "Delayed pending orders",
        count: oldPendingOrders.length,
      });
    }

    const unpaidOrders = orders.filter((order) => !isOrderPaid(order)).length;
    if (unpaidOrders > 0) {
      alerts.push({
        type: "payment",
        message: "Unpaid orders",
        count: unpaidOrders,
      });
    }

    // 13. Cost data availability check
    const ordersWithCostData = paidOrders.filter((order) =>
      (order.order_items as unknown as OrderItem[]).some(
        (item) => getItemCostPrice(item) > 0
      )
    );

    const costDataAvailability =
      paidOrders.length > 0
        ? (ordersWithCostData.length / paidOrders.length) * 100
        : 0;

    if (costDataAvailability < 100 && paidOrders.length > 0) {
      alerts.push({
        type: "payment",
        message: `Incomplete cost data (${Math.round(
          100 - costDataAvailability
        )}% of orders)`,
        count: paidOrders.length - ordersWithCostData.length,
      });
    }

    // Update all metrics
    setMetrics({
      revenue: currentRevenue,
      orderCount: currentOrderCount,
      averageOrderValue: currentAOV,
      grossProfit: currentProfit,
      changePercentage: {
        revenue: calculateChange(currentRevenue, prevRevenue),
        orders: calculateChange(currentOrderCount, prevOrderCount),
        aov: calculateChange(currentAOV, prevAOV),
        profit: calculateChange(currentProfit, prevProfit),
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
    filterOrdersByPeriod,
    getPreviousPeriodDates,
    isOrderPaid,
    calculateItemProfit,
    getItemCostPrice,
    getProductAvailableQuantity,
    getVariantAvailableQuantity,
    isVariantLowStock,
    isProductLowStock,
  ]);

  // Recalculate when dependencies change
  useEffect(() => {
    calculateAllMetrics();
  }, [calculateAllMetrics]);

  return metrics;
};
