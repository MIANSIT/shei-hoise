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

// Define proper types for order items - UPDATED FOR YOUR SCHEMA
interface OrderItem {
  id: string;
  product_name: string;
  product_id: string;
  variant_id?: string;
  unit_price: number; // This is tp_price or base price
  discounted_amount?: number; // If discount exists
  quantity: number;
  // Your schema doesn't have cost_price or profit_margin
  products?: {
    name: string;
    base_price: number;
    sale_price?: number;
    // Your schema doesn't have cost_price or profit_margin
  };
  product_variants?: {
    variant_name: string;
    base_price: number;
    sale_price?: number;
    // Your schema doesn't have cost_price or profit_margin
  };
}

// Define proper types that match your actual Product structure
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

  // Helper: Get the selling price for an item (your actual schema)
  const getItemSellingPrice = useCallback((item: OrderItem): number => {
    // If discounted_amount exists, use it
    // Otherwise use unit_price (which is tp_price or base price)
    return item.discounted_amount || item.unit_price;
  }, []);

  // Helper: Estimate cost price since you don't have cost data
  // You'll need to decide on a default profit margin
  const ESTIMATED_COST_PERCENTAGE = 0.6; // Assumes 40% profit margin (60% cost)

  // Helper: Get estimated cost price for an item
  const getItemEstimatedCost = useCallback(
    (item: OrderItem): number => {
      const sellingPrice = getItemSellingPrice(item);

      // Since you don't have cost data, we estimate it
      // This is just an example - you should adjust based on your actual business
      return sellingPrice * ESTIMATED_COST_PERCENTAGE;
    },
    [getItemSellingPrice]
  );

  // Helper: Calculate estimated profit for an order item
  const calculateItemProfit = useCallback(
    (item: OrderItem): number => {
      const sellingPrice = getItemSellingPrice(item);
      const estimatedCost = getItemEstimatedCost(item);

      return sellingPrice - estimatedCost;
    },
    [getItemSellingPrice, getItemEstimatedCost]
  );

  // ================== UPDATED TIME PERIOD LOGIC ==================
  // OPTION 2: For dashboard (comparing current vs previous)
  // Daily = Today vs Yesterday
  // Weekly = This Week vs Last Week
  // Monthly = This Month vs Last Month
  // Yearly = This Year vs Last Year

  // Helper: Get current period dates
  const getCurrentPeriodDates = useCallback(
    (period: TimePeriod): { start: Date; end: Date } => {
      const now = new Date();
      const startDate = new Date();
      const endDate = new Date();

      switch (period) {
        case "daily":
          // TODAY
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "weekly":
          // THIS WEEK (Monday to Sunday)
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday of this week
          startDate.setDate(diff);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(diff + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "monthly":
          // THIS MONTH
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
          endDate.setHours(23, 59, 59, 999);
          break;
        case "yearly":
          // THIS YEAR
          startDate.setMonth(0, 1); // January 1st
          startDate.setHours(0, 0, 0, 0);
          endDate.setMonth(11, 31); // December 31st
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
      const currentPeriod = getCurrentPeriodDates(period);
      const prevStart = new Date(currentPeriod.start);
      const prevEnd = new Date(currentPeriod.end);

      switch (period) {
        case "daily":
          // YESTERDAY (same duration as today)
          prevStart.setDate(prevStart.getDate() - 1);
          prevEnd.setDate(prevEnd.getDate() - 1);
          break;
        case "weekly":
          // LAST WEEK (same duration as this week)
          prevStart.setDate(prevStart.getDate() - 7);
          prevEnd.setDate(prevEnd.getDate() - 7);
          break;
        case "monthly":
          // LAST MONTH
          prevStart.setMonth(prevStart.getMonth() - 1);
          prevEnd.setMonth(prevEnd.getMonth() - 1, 0); // Last day of last month
          break;
        case "yearly":
          // LAST YEAR
          prevStart.setFullYear(prevStart.getFullYear() - 1);
          prevEnd.setFullYear(prevEnd.getFullYear() - 1);
          break;
      }

      return { start: prevStart, end: prevEnd };
    },
    [getCurrentPeriodDates]
  );

  // Helper: Filter orders by time period
  const filterOrdersByPeriod = useCallback(
    (ordersList: StoreOrder[], period: TimePeriod): StoreOrder[] => {
      const { start, end } = getCurrentPeriodDates(period);

      return ordersList.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= start && orderDate <= end;
      });
    },
    [getCurrentPeriodDates]
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

  // Helper: Calculate order subtotal (sum of item prices without tax/shipping)
  const calculateOrderSubtotal = useCallback((order: StoreOrder): number => {
    return Number(order.subtotal) || 0;
  }, []);

  // Helper: Calculate order total (including tax, shipping, etc.)
  const calculateOrderTotal = useCallback((order: StoreOrder): number => {
    return Number(order.total_amount) || 0;
  }, []);

  // Helper: Get item revenue (selling price × quantity)
  const getItemRevenue = useCallback(
    (item: OrderItem): number => {
      const sellingPrice = getItemSellingPrice(item);
      const quantity = item.quantity || 1;
      return sellingPrice * quantity;
    },
    [getItemSellingPrice]
  );

  // Helper: Get item estimated cost (estimated cost × quantity)
  const getItemEstimatedCostTotal = useCallback(
    (item: OrderItem): number => {
      const estimatedCost = getItemEstimatedCost(item);
      const quantity = item.quantity || 1;
      return estimatedCost * quantity;
    },
    [getItemEstimatedCost]
  );

  // Main calculation function
  const calculateAllMetrics = useCallback(() => {
    if (!storeId || orders.length === 0) return;

    // 1. Filter orders for CURRENT period
    const currentOrders = filterOrdersByPeriod(orders, timePeriod);
    const currentPaidOrders = currentOrders.filter(isOrderPaid);

    // 2. Calculate revenue from SUBTOTAL for current period (paid orders only)
    const currentRevenue = currentPaidOrders.reduce(
      (sum, order) => sum + calculateOrderSubtotal(order),
      0
    );

    // 3. Calculate estimated profit for current period (paid orders only)
    const currentProfit = currentPaidOrders.reduce((sum, order) => {
      const orderProfit = (order.order_items as unknown as OrderItem[]).reduce(
        (itemSum, item) => {
          const quantity = item.quantity || 1;
          return itemSum + calculateItemProfit(item) * quantity;
        },
        0
      );
      return sum + orderProfit;
    }, 0);

    // 4. Calculate Average Order Value using SUBTOTAL for current period
    const currentOrderCount = currentOrders.length;
    const currentRevenueAllOrders = currentOrders.reduce(
      (sum, order) => sum + calculateOrderSubtotal(order),
      0
    );
    const currentAOV =
      currentOrderCount > 0 ? currentRevenueAllOrders / currentOrderCount : 0;

    // 5. Calculate previous period metrics for comparison
    const prevPeriod = getPreviousPeriodDates(timePeriod);
    const prevPeriodOrders = orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= prevPeriod.start && orderDate <= prevPeriod.end;
    });
    const prevPeriodPaidOrders = prevPeriodOrders.filter(isOrderPaid);

    // Using subtotal for previous period revenue as well
    const prevRevenue = prevPeriodPaidOrders.reduce(
      (sum, order) => sum + calculateOrderSubtotal(order),
      0
    );
    const prevOrderCount = prevPeriodOrders.length;

    // Calculate previous period AOV using subtotal
    const prevRevenueAllOrders = prevPeriodOrders.reduce(
      (sum, order) => sum + calculateOrderSubtotal(order),
      0
    );
    const prevAOV =
      prevOrderCount > 0 ? prevRevenueAllOrders / prevOrderCount : 0;

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

    // 6. Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // 7. Order status counts (for ALL orders)
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

    // 8. Sales trend (Last 30 days, paid orders only)
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
        .reduce((sum, order) => sum + calculateOrderSubtotal(order), 0);

      salesTrend.push({
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales: daySales,
      });
    }

    // 9. Customer analytics
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
          totalSpent: calculateOrderSubtotal(order),
          orders: 1,
          firstOrderDate: orderDate,
        });
      } else {
        customerMap.set(customerId, {
          name: current.name,
          totalSpent: current.totalSpent + calculateOrderSubtotal(order),
          orders: current.orders + 1,
          firstOrderDate:
            current.firstOrderDate < orderDate
              ? current.firstOrderDate
              : orderDate,
        });
      }
    });

    // Find top customer (overall)
    let topCustomer = { name: "No customers", totalSpent: 0 };
    customerMap.forEach((customer) => {
      if (customer.totalSpent > topCustomer.totalSpent) {
        topCustomer = { name: customer.name, totalSpent: customer.totalSpent };
      }
    });

    // Calculate new customers (first order in CURRENT period)
    const currentPeriod = getCurrentPeriodDates(timePeriod);
    const newCustomers = Array.from(customerMap.values()).filter(
      (customer) =>
        customer.firstOrderDate >= currentPeriod.start &&
        customer.firstOrderDate <= currentPeriod.end
    ).length;

    const totalCustomers = customerMap.size;
    const returningCustomers = Array.from(customerMap.values()).filter(
      (customer) => customer.orders > 1
    ).length;
    const returningRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // 10. Top products in CURRENT period (ALL orders, not just paid)
    const productMap = new Map<
      string,
      {
        revenue: number;
        quantity: number;
        cost: number;
        profit: number;
      }
    >();

    // Changed from currentPaidOrders to currentOrders to include all orders
    currentOrders.forEach((order) => {
      (order.order_items as unknown as OrderItem[]).forEach((item) => {
        const current = productMap.get(item.product_name) || {
          revenue: 0,
          quantity: 0,
          cost: 0,
          profit: 0,
        };

        const itemRevenue = getItemRevenue(item);
        const itemCost = getItemEstimatedCostTotal(item);
        const itemProfit = itemRevenue - itemCost;

        productMap.set(item.product_name, {
          revenue: current.revenue + itemRevenue,
          quantity: current.quantity + (item.quantity || 1),
          cost: current.cost + itemCost,
          profit: current.profit + itemProfit,
        });
      });
    });

    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity) // Sort by quantity sold
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        quantity: data.quantity,
        cost: data.cost,
        profit: data.profit,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }));

    // 11. Payment amounts (for ALL orders) - Use total_amount here since it represents actual payment amounts
    const paymentAmounts: Record<PaymentStatus, number> = {
      paid: 0,
      pending: 0,
      refunded: 0,
    };

    orders.forEach((order) => {
      const amount = calculateOrderTotal(order);
      const key = (order.payment_status?.toLowerCase() ||
        "pending") as PaymentStatus;
      if (key in paymentAmounts) paymentAmounts[key] += amount;
    });

    // 12. Inventory counts
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

    // 13. Alerts
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
      filteredOrders: currentOrders,
      paidOrders: currentPaidOrders,
    });
  }, [
    storeId,
    orders,
    products,
    timePeriod,
    filterOrdersByPeriod,
    getCurrentPeriodDates,
    getPreviousPeriodDates,
    isOrderPaid,
    calculateItemProfit,
    getItemRevenue,
    getItemEstimatedCostTotal,
    calculateOrderSubtotal,
    calculateOrderTotal,
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
