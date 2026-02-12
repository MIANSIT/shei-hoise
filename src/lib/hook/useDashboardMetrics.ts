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
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProductCount: number;
  outOfStockProductCount: number;
  totalInventoryValue: number;
  paymentAmounts: Record<PaymentStatus, number>;
  alerts: { type: AlertType; message: string; count: number }[];
  filteredOrders: StoreOrder[];
  paidOrders: StoreOrder[];
}

// ─────────────────────────────────────────────
// Helper: stable ISO date key (no locale issues)
// "2025-02-11" instead of locale-dependent toDateString()
// ─────────────────────────────────────────────
const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

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

  // ─────────────────────────────────────────────
  // isOrderPaid
  // ─────────────────────────────────────────────
  const isOrderPaid = useCallback(
    (order: StoreOrder) => order.payment_status?.toLowerCase() === "paid",
    [],
  );

  // ─────────────────────────────────────────────
  // Period helpers
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // Main calculation
  // ─────────────────────────────────────────────
  const calculateAllMetrics = useCallback(() => {
    if (!storeId) return;

    const currentPeriod = getCurrentPeriodDates(timePeriod);
    const prevPeriod = getPreviousPeriodDates(timePeriod);

    // ─── FIX 1: Build O(1) lookup maps ONCE before the order loop ───
    // Previously: products.find() was called inside every order item = O(n²)
    // Now: one Map lookup per item = O(1)
    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(
      products.flatMap((p) => (p.variants ?? []).map((v) => [v.id, v])),
    );

    // Inline helpers that use the maps (no useCallback needed inside calculateAllMetrics)
    const getItemSellingPrice = (item: OrderItem): number =>
      item.discounted_amount ?? item.unit_price;

    const getItemCost = (item: OrderItem): number => {
      if (item.variant_id != null) {
        const variant = variantMap.get(item.variant_id);
        if (variant?.tp_price != null) return variant.tp_price;
      }
      return productMap.get(item.product_id)?.tp_price ?? 0;
    };

    const calculateItemProfit = (item: OrderItem): number =>
      getItemSellingPrice(item) - getItemCost(item);

    // ─── Accumulators ───
    let revenue = 0,
      grossProfit = 0,
      orderCount = 0,
      paidOrderCount = 0,
      totalOrderValue = 0;

    // ─── FIX 2: Separate previous-period counters for ALL orders vs PAID orders ───
    // Previously: prevOrderCount only incremented for paid orders,
    // but current orderCount counts ALL orders → wrong % change
    let prevRevenue = 0,
      prevOrderCount = 0, // all orders in prev period
      prevTotalOrderValue = 0, // all order subtotals in prev period
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

    // Sales trend: last 30 days, keyed by ISO date string (FIX 3: was toDateString() = locale bug)
    const salesTrendMap = new Map<string, number>();
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      salesTrendMap.set(toDateKey(d), 0);
    }

    const topProductsMap = new Map<
      string,
      { revenue: number; quantity: number; cost: number; profit: number }
    >();
    const customerMap = new Map<
      string,
      {
        name: string;
        totalSpent: number;
        orders: number;
        firstOrderDate: Date;
      }
    >();
    const paidCustomerMap = new Map<
      string,
      { name: string; totalSpent: number }
    >();

    const filteredOrders: StoreOrder[] = [];
    const paidOrders: StoreOrder[] = [];

    // ─── Single pass over all orders ───
    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const subtotal = Number(order.subtotal) || 0;
      const total = Number(order.total_amount) || 0;
      const isPaid = isOrderPaid(order);

      // ── Current period ──
      const inCurrentPeriod =
        orderDate >= currentPeriod.start && orderDate <= currentPeriod.end;

      if (inCurrentPeriod) {
        filteredOrders.push(order);
        orderCount++;
        totalOrderValue += subtotal;

        if (isPaid) {
          revenue += subtotal;
          paidOrders.push(order);
          paidOrderCount++;

          // ─── FIX 4: Gross profit accumulated HERE in the same loop ───
          // Previously: there was a second .reduce() loop over filteredOrders after
          // this forEach — redundant double iteration. Now calculated inline.
          grossProfit += (order.order_items ?? []).reduce(
            (s, item) => s + calculateItemProfit(item) * (item.quantity || 1),
            0,
          );
        }
      }

      // ── Previous period ──
      const inPrevPeriod =
        orderDate >= prevPeriod.start && orderDate <= prevPeriod.end;

      if (inPrevPeriod) {
        // FIX 2 continued: count ALL prev-period orders (not just paid)
        prevOrderCount++;
        prevTotalOrderValue += subtotal;

        if (isPaid) {
          prevRevenue += subtotal;
          prevProfit += (order.order_items ?? []).reduce(
            (sum, item) =>
              sum + calculateItemProfit(item) * (item.quantity || 1),
            0,
          );
        }
      }

      // ── Order status counts (ALL orders, all time) ──
      const statusKey = (order.status?.toLowerCase() ||
        "pending") as OrderStatus;
      if (statusKey in orderStatusCounts) {
        orderStatusCounts[statusKey]++;
      }

      // ── Payment amounts (ALL orders, all time) ──
      const paymentKey = (order.payment_status?.toLowerCase() ||
        "pending") as PaymentStatus;
      if (paymentKey in paymentAmounts) {
        paymentAmounts[paymentKey] += total;
      }

      // ── Sales trend (paid only, last 30 days) ──
      if (isPaid) {
        const dayKey = toDateKey(new Date(order.created_at)); // FIX 3: stable key
        if (salesTrendMap.has(dayKey)) {
          salesTrendMap.set(
            dayKey,
            (salesTrendMap.get(dayKey) || 0) + subtotal,
          );
        }
      }

      // ── Customer tracking ──
      if (!order.customers?.id) return;
      const customerId = order.customers.id;
      const firstName = order.customers.first_name || "Unknown";

      const existing = customerMap.get(customerId);
      if (!existing) {
        customerMap.set(customerId, {
          name: firstName,
          totalSpent: subtotal,
          orders: 1,
          firstOrderDate: orderDate,
        });
      } else {
        customerMap.set(customerId, {
          ...existing,
          totalSpent: existing.totalSpent + subtotal,
          orders: existing.orders + 1,
        });
      }

      if (isPaid) {
        const paidExisting = paidCustomerMap.get(customerId);
        if (!paidExisting) {
          paidCustomerMap.set(customerId, {
            name: firstName,
            totalSpent: subtotal,
          });
        } else {
          paidCustomerMap.set(customerId, {
            name: paidExisting.name,
            totalSpent: paidExisting.totalSpent + subtotal,
          });
        }
      }

      // ── Top products (paid only) ──
      if (isPaid) {
        (order.order_items ?? []).forEach((item) => {
          const current = topProductsMap.get(item.product_name) || {
            revenue: 0,
            quantity: 0,
            cost: 0,
            profit: 0,
          };
          const qty = item.quantity || 1;
          const sell = getItemSellingPrice(item);
          const cost = getItemCost(item);

          topProductsMap.set(item.product_name, {
            revenue: current.revenue + sell * qty,
            quantity: current.quantity + qty,
            cost: current.cost + cost * qty,
            profit: current.profit + (sell - cost) * qty,
          });
        });
      }
    });

    // ─────────────────────────────────────────────
    // Inventory metrics
    // ─────────────────────────────────────────────
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let lowStockProductCount = 0;
    let outOfStockProductCount = 0;
    let totalInventoryValue = 0;

    products.forEach((product) => {
      let productHasStock = false;
      let productHasLowStock = false;

      const variants =
        product.variants?.length > 0
          ? product.variants
          : [product as unknown as ProductVariant];

      variants.forEach((variant) => {
        const stock = variant.stock;
        if (!stock || !stock.track_inventory) return;

        const qty = stock.quantity_available ?? 0;
        const threshold = stock.low_stock_threshold ?? 0;
        const tpPrice = variant.tp_price ?? 0;

        if (qty > 0) {
          inStockCount += qty;
          productHasStock = true;
          totalInventoryValue += qty * tpPrice;

          if (qty <= threshold) {
            lowStockCount += qty;
            productHasLowStock = true;
          }
        } else {
          outOfStockCount++;
        }
      });

      if (!productHasStock) outOfStockProductCount++;
      else if (productHasLowStock) lowStockProductCount++;
    });

    // ─────────────────────────────────────────────
    // Customer snapshot
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // Top products (sorted by quantity sold)
    // ─────────────────────────────────────────────
    const topProducts = Array.from(topProductsMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        ...data,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }));

    // ─────────────────────────────────────────────
    // Sales trend (sorted chronologically)
    // ─────────────────────────────────────────────
    const salesTrend = Array.from(salesTrendMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, sales]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        sales,
      }));

    // ─────────────────────────────────────────────
    // Alerts
    // ─────────────────────────────────────────────
    const alerts: { type: AlertType; message: string; count: number }[] = [];

    if (lowStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: "Low stock products need attention",
        count: lowStockProductCount,
      });

    if (outOfStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: "Out of stock products detected",
        count: outOfStockProductCount,
      });

    if (orderStatusCounts.pending > 0)
      alerts.push({
        type: "order",
        message: "Pending orders require action",
        count: orderStatusCounts.pending,
      });

    // ─── FIX 5: Count actual pending-payment orders instead of hardcoding 1 ───
    const pendingPaymentOrderCount = filteredOrders.filter(
      (o) => o.payment_status?.toLowerCase() === "pending",
    ).length;
    if (pendingPaymentOrderCount > 0)
      alerts.push({
        type: "payment",
        message: "Pending payments awaiting confirmation",
        count: pendingPaymentOrderCount, // was hardcoded to 1 before
      });

    // ─────────────────────────────────────────────
    // % change helper
    // ─────────────────────────────────────────────
    const calculateChange = (current: number, previous: number): number =>
      previous === 0
        ? current > 0
          ? 100
          : 0
        : ((current - previous) / previous) * 100;

    // ─── FIX 3 (AOV): compare like-for-like ───
    // Previously: current AOV used totalOrderValue (all orders),
    // but prev AOV used prevRevenue (paid only) → apples vs oranges
    const currentAOV = orderCount > 0 ? totalOrderValue / orderCount : 0;
    const prevAOV =
      prevOrderCount > 0 ? prevTotalOrderValue / prevOrderCount : 0;

    // ─────────────────────────────────────────────
    // Commit to state
    // ─────────────────────────────────────────────
    setMetrics({
      revenue,
      orderCount,
      averageOrderValue: currentAOV,
      paidAverageOrderValue: paidOrderCount > 0 ? revenue / paidOrderCount : 0,
      grossProfit,
      changePercentage: {
        revenue: calculateChange(revenue, prevRevenue),
        orders: calculateChange(orderCount, prevOrderCount),
        aov: calculateChange(currentAOV, prevAOV),
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
      totalInventoryValue,
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
  ]);
  // NOTE: getItemCost / getItemSellingPrice / calculateItemProfit are now defined
  // inside calculateAllMetrics (not useCallback), so they don't need to be in deps.

  useEffect(() => {
    calculateAllMetrics();
  }, [calculateAllMetrics]);

  return metrics;
};
