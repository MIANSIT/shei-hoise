// app/hooks/useDashboardMetrics.ts
import { useCallback, useEffect, useState } from "react";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import { Product } from "@/lib/queries/products/getProducts";
import type { Expense } from "@/lib/types/expense/type";

export type TimePeriod = "weekly" | "monthly" | "yearly";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";
export type AlertType = "stock" | "order" | "payment" | "expense";

interface ProductVariant {
  id: string;
  variant_name: string;
  base_price: number;
  sale_price?: number;
  tp_price?: number;
  is_active?: boolean;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
  stock: {
    quantity_available: number;
    low_stock_threshold?: number;
    track_inventory?: boolean;
    is_low_stock?: boolean;
  };
}

type DashboardProduct = Product & {
  variants: ProductVariant[];
  is_out_of_stock?: boolean;
  is_partially_out_of_stock?: boolean;
};

// ─────────────────────────────────────────────
// Expense Metrics Types
// ─────────────────────────────────────────────
export interface ExpenseMetrics {
  totalExpenses: number;
  netProfit: number;
  expenseToRevenueRatio: number;
  topExpenseCategory: { name: string; amount: number };
  expenseCategoryBreakdown: {
    name: string;
    amount: number;
    percentage: number;
  }[];
  changePercentage: {
    expenses: number;
    netProfit: number;
  };
  averageExpenseAmount: number;
  expenseCount: number;
  expenseByPaymentMethod: { method: string; amount: number }[];
}

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
  // Unit-level counts (how many individual units)
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  // Product-level counts (how many distinct products)
  lowStockProductCount: number;
  outOfStockProductCount: number;
  partiallyOutOfStockProductCount: number; // NEW: products where SOME variants are OOS
  totalInventoryValue: number;
  paymentAmounts: Record<PaymentStatus, number>;
  alerts: { type: AlertType; message: string; count: number }[];
  filteredOrders: StoreOrder[];
  paidOrders: StoreOrder[];
  expenseMetrics: ExpenseMetrics;
}

// ─────────────────────────────────────────────
// Helper: stable ISO date key
// ─────────────────────────────────────────────
const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

// ─────────────────────────────────────────────
// Helper: product-only revenue (shipping excluded)
//
// shipping_fee is paid to the courier — NOT store revenue.
// revenue = total_amount - shipping_fee
// ─────────────────────────────────────────────
const getOrderRevenue = (order: StoreOrder): number => {
  const total = Number(order.total_amount) || 0;
  const shipping = Number(order.shipping_fee) || 0;
  return total - shipping;
};

// ─────────────────────────────────────────────
// Helper: adjustment ratio (shipping excluded)
// ─────────────────────────────────────────────
const getOrderAdjustmentRatio = (order: StoreOrder): number => {
  const subtotal = Number(order.subtotal) || 0;
  const total = Number(order.total_amount) || 0;
  const shipping = Number(order.shipping_fee) || 0;
  if (subtotal === 0) return 1;
  return (total - shipping) / subtotal;
};

// ─────────────────────────────────────────────
// Default / empty expense metrics
// ─────────────────────────────────────────────
const defaultExpenseMetrics: ExpenseMetrics = {
  totalExpenses: 0,
  netProfit: 0,
  expenseToRevenueRatio: 0,
  topExpenseCategory: { name: "None", amount: 0 },
  expenseCategoryBreakdown: [],
  changePercentage: { expenses: 0, netProfit: 0 },
  averageExpenseAmount: 0,
  expenseCount: 0,
  expenseByPaymentMethod: [],
};

export const useDashboardMetrics = (
  storeId: string | null,
  orders: StoreOrder[],
  products: DashboardProduct[],
  expenses: Expense[],
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
    partiallyOutOfStockProductCount: 0,
    totalInventoryValue: 0,
    paymentAmounts: { paid: 0, pending: 0, refunded: 0 },
    alerts: [],
    filteredOrders: [],
    paidOrders: [],
    expenseMetrics: defaultExpenseMetrics,
  });

  const isOrderPaid = useCallback(
    (order: StoreOrder) => order.payment_status?.toLowerCase() === "paid",
    [],
  );

  // ─────────────────────────────────────────────
  // Period helpers
  // ─────────────────────────────────────────────
  const getCurrentPeriodDates = useCallback((period: TimePeriod) => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "weekly": {
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: endDate };
      }
      case "monthly": {
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: endDate };
      }
      case "yearly": {
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 364);
        startDate.setHours(0, 0, 0, 0);
        return { start: startDate, end: endDate };
      }
    }
  }, []);

  const getPreviousPeriodDates = useCallback((period: TimePeriod) => {
    const now = new Date();

    switch (period) {
      case "weekly": {
        const prevEnd = new Date(now);
        prevEnd.setDate(now.getDate() - 7);
        prevEnd.setHours(23, 59, 59, 999);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 6);
        prevStart.setHours(0, 0, 0, 0);
        return { start: prevStart, end: prevEnd };
      }
      case "monthly": {
        const prevEnd = new Date(now);
        prevEnd.setDate(now.getDate() - 30);
        prevEnd.setHours(23, 59, 59, 999);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 29);
        prevStart.setHours(0, 0, 0, 0);
        return { start: prevStart, end: prevEnd };
      }
      case "yearly": {
        const prevEnd = new Date(now);
        prevEnd.setDate(now.getDate() - 365);
        prevEnd.setHours(23, 59, 59, 999);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 364);
        prevStart.setHours(0, 0, 0, 0);
        return { start: prevStart, end: prevEnd };
      }
    }
  }, []);

  const calculateAllMetrics = useCallback(() => {
    if (!storeId) return;

    const currentPeriod = getCurrentPeriodDates(timePeriod);
    const prevPeriod = getPreviousPeriodDates(timePeriod);

    // ─── Build O(1) lookup maps for products/variants ───
    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(
      products.flatMap((p) => (p.variants ?? []).map((v) => [v.id, v])),
    );

    const getItemSellingPrice = (item: OrderItem): number =>
      item.discounted_amount ?? item.unit_price;

    const getItemCost = (item: OrderItem): number => {
      if (item.variant_id != null) {
        const variant = variantMap.get(item.variant_id);
        if (variant?.tp_price != null) return variant.tp_price;
      }
      return productMap.get(item.product_id)?.tp_price ?? 0;
    };

    // ─── Order accumulators ───
    let revenue = 0,
      grossProfit = 0,
      orderCount = 0,
      paidOrderCount = 0,
      totalOrderValue = 0;

    let prevRevenue = 0,
      prevOrderCount = 0,
      prevTotalOrderValue = 0,
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

    // Sales trend: last 30 days
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
      const isPaid = isOrderPaid(order);

      const trueOrderRevenue = getOrderRevenue(order);
      const adjustmentRatio = getOrderAdjustmentRatio(order);

      const inCurrentPeriod =
        orderDate >= currentPeriod.start && orderDate <= currentPeriod.end;

      if (inCurrentPeriod) {
        filteredOrders.push(order);
        orderCount++;
        totalOrderValue += trueOrderRevenue;

        if (isPaid) {
          revenue += trueOrderRevenue;
          paidOrders.push(order);
          paidOrderCount++;

          grossProfit += (order.order_items ?? []).reduce((s, item) => {
            const qty = item.quantity || 1;
            const adjustedSell = getItemSellingPrice(item) * adjustmentRatio;
            const cost = getItemCost(item);
            return s + (adjustedSell - cost) * qty;
          }, 0);
        }
      }

      const inPrevPeriod =
        orderDate >= prevPeriod.start && orderDate <= prevPeriod.end;

      if (inPrevPeriod) {
        prevOrderCount++;
        prevTotalOrderValue += trueOrderRevenue;

        if (isPaid) {
          prevRevenue += trueOrderRevenue;
          prevProfit += (order.order_items ?? []).reduce((sum, item) => {
            const qty = item.quantity || 1;
            const adjustedSell = getItemSellingPrice(item) * adjustmentRatio;
            const cost = getItemCost(item);
            return sum + (adjustedSell - cost) * qty;
          }, 0);
        }
      }

      const statusKey = (order.status?.toLowerCase() ||
        "pending") as OrderStatus;
      if (statusKey in orderStatusCounts) orderStatusCounts[statusKey]++;

      const paymentKey = (order.payment_status?.toLowerCase() ||
        "pending") as PaymentStatus;
      if (paymentKey in paymentAmounts)
        paymentAmounts[paymentKey] += trueOrderRevenue;

      if (isPaid) {
        const dayKey = toDateKey(new Date(order.created_at));
        if (salesTrendMap.has(dayKey)) {
          salesTrendMap.set(
            dayKey,
            (salesTrendMap.get(dayKey) || 0) + trueOrderRevenue,
          );
        }
      }

      if (!order.customers?.id) return;
      const customerId = order.customers.id;
      const firstName = order.customers.first_name || "Unknown";

      const existing = customerMap.get(customerId);
      if (!existing) {
        customerMap.set(customerId, {
          name: firstName,
          totalSpent: trueOrderRevenue,
          orders: 1,
          firstOrderDate: orderDate,
        });
      } else {
        customerMap.set(customerId, {
          ...existing,
          totalSpent: existing.totalSpent + trueOrderRevenue,
          orders: existing.orders + 1,
        });
      }

      if (isPaid) {
        const paidExisting = paidCustomerMap.get(customerId);
        if (!paidExisting) {
          paidCustomerMap.set(customerId, {
            name: firstName,
            totalSpent: trueOrderRevenue,
          });
        } else {
          paidCustomerMap.set(customerId, {
            name: paidExisting.name,
            totalSpent: paidExisting.totalSpent + trueOrderRevenue,
          });
        }
      }

      if (isPaid) {
        (order.order_items ?? []).forEach((item) => {
          const current = topProductsMap.get(item.product_name) || {
            revenue: 0,
            quantity: 0,
            cost: 0,
            profit: 0,
          };
          const qty = item.quantity || 1;
          const adjustedSell = getItemSellingPrice(item) * adjustmentRatio;
          const cost = getItemCost(item);

          topProductsMap.set(item.product_name, {
            revenue: current.revenue + adjustedSell * qty,
            quantity: current.quantity + qty,
            cost: current.cost + cost * qty,
            profit: current.profit + (adjustedSell - cost) * qty,
          });
        });
      }
    });

    // ─────────────────────────────────────────────
    // EXPENSE METRICS
    // ─────────────────────────────────────────────
    let totalExpenses = 0;
    let prevTotalExpenses = 0;
    let expenseCount = 0;

    const categoryTotalsMap = new Map<string, number>();
    const paymentMethodMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const expenseDate = new Date(`${expense.expense_date}T12:00:00`);
      const amount = Number(expense.amount) || 0;

      const inCurrentPeriod =
        expenseDate >= currentPeriod.start && expenseDate <= currentPeriod.end;
      const inPrevPeriod =
        expenseDate >= prevPeriod.start && expenseDate <= prevPeriod.end;

      if (inCurrentPeriod) {
        totalExpenses += amount;
        expenseCount++;

        const catName = expense.category?.name ?? "Uncategorized";
        categoryTotalsMap.set(
          catName,
          (categoryTotalsMap.get(catName) ?? 0) + amount,
        );

        const method = expense.payment_method ?? "Unknown";
        paymentMethodMap.set(
          method,
          (paymentMethodMap.get(method) ?? 0) + amount,
        );
      }

      if (inPrevPeriod) {
        prevTotalExpenses += amount;
      }
    });

    const netProfit = grossProfit - totalExpenses;
    const prevNetProfit = prevProfit - prevTotalExpenses;

    const expenseToRevenueRatio =
      revenue > 0
        ? parseFloat(((totalExpenses / revenue) * 100).toFixed(1))
        : 0;

    const averageExpenseAmount =
      expenseCount > 0 ? totalExpenses / expenseCount : 0;

    let topExpenseCategory = { name: "None", amount: 0 };
    categoryTotalsMap.forEach((amount, name) => {
      if (amount > topExpenseCategory.amount) {
        topExpenseCategory = { name, amount };
      }
    });

    const expenseCategoryBreakdown = Array.from(categoryTotalsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage:
          totalExpenses > 0
            ? parseFloat(((amount / totalExpenses) * 100).toFixed(1))
            : 0,
      }));

    const expenseByPaymentMethod = Array.from(paymentMethodMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => ({ method, amount }));

    // ─────────────────────────────────────────────
    // INVENTORY METRICS — FIXED
    //
    // Three product-level states:
    //   1. fully out of stock   → outOfStockProductCount
    //   2. partially OOS        → partiallyOutOfStockProductCount
    //      (some variants OOS, some have stock)
    //   3. low stock            → lowStockProductCount
    //      (has stock but qty ≤ threshold for at least one variant)
    //
    // A product can only appear in ONE bucket (priority: OOS > partial > low)
    // ─────────────────────────────────────────────
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let lowStockProductCount = 0;
    let outOfStockProductCount = 0;
    let partiallyOutOfStockProductCount = 0;
    let totalInventoryValue = 0;

    products.forEach((product) => {
      const activeVariants = (product.variants ?? []).filter(
        (v) => v.is_active !== false,
      );

      if (activeVariants.length > 0) {
        // ── Variant-based product ──
        let productHasAnyStock = false;
        let productHasAnyOos = false;
        let productHasLowStock = false;

        activeVariants.forEach((variant) => {
          const stock = variant.stock;
          if (!stock || !stock.track_inventory) return;

          const qty = stock.quantity_available ?? 0;
          const threshold = stock.low_stock_threshold ?? 0;

          const variantPrice =
            variant.discounted_price && variant.discounted_price > 0
              ? variant.discounted_price
              : (variant.price ?? 0);

          if (qty > 0) {
            inStockCount += qty;
            productHasAnyStock = true;
            totalInventoryValue += qty * variantPrice;

            if (qty <= threshold) {
              // In stock but at/below threshold = low stock
              lowStockCount += qty;
              productHasLowStock = true;
            }
          } else {
            // This specific variant is completely out
            outOfStockCount++;
            productHasAnyOos = true;
          }
        });

        // Assign product to exactly ONE bucket
        if (!productHasAnyStock) {
          // Every active variant is OOS
          outOfStockProductCount++;
        } else if (productHasAnyOos) {
          // Some variants OOS, some in stock → partial
          partiallyOutOfStockProductCount++;
        } else if (productHasLowStock) {
          // All in stock but some are low
          lowStockProductCount++;
        }
      } else {
        // ── No-variant product ──
        const stock = product.stock;
        if (!stock || !stock.track_inventory) return;

        const qty = stock.quantity_available ?? 0;
        const threshold = stock.low_stock_threshold ?? 0;

        const sellingPrice =
          product.discounted_price && product.discounted_price > 0
            ? product.discounted_price
            : (product.base_price ?? 0);

        if (qty > 0) {
          inStockCount += qty;
          totalInventoryValue += qty * sellingPrice;

          if (qty <= threshold) {
            lowStockCount += qty;
            lowStockProductCount++;
          }
        } else {
          outOfStockCount++;
          outOfStockProductCount++;
        }
      }
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
    // Top products
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
    // Sales trend
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
    // % change helper
    // ─────────────────────────────────────────────
    const calculateChange = (current: number, previous: number): number =>
      previous === 0
        ? current > 0
          ? 100
          : 0
        : ((current - previous) / previous) * 100;

    const currentAOV = orderCount > 0 ? totalOrderValue / orderCount : 0;
    const prevAOV =
      prevOrderCount > 0 ? prevTotalOrderValue / prevOrderCount : 0;

    // ─────────────────────────────────────────────
    // Alerts — now includes partial OOS
    // ─────────────────────────────────────────────
    const alerts: { type: AlertType; message: string; count: number }[] = [];

    if (outOfStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: "Products completely out of stock",
        count: outOfStockProductCount,
      });

    if (partiallyOutOfStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: "Products with some variants out of stock",
        count: partiallyOutOfStockProductCount,
      });

    if (lowStockProductCount > 0)
      alerts.push({
        type: "stock",
        message: "Low stock products need attention",
        count: lowStockProductCount,
      });

    if (orderStatusCounts.pending > 0)
      alerts.push({
        type: "order",
        message: "Pending orders require action",
        count: orderStatusCounts.pending,
      });

    const pendingPaymentOrderCount = filteredOrders.filter(
      (o) => o.payment_status?.toLowerCase() === "pending",
    ).length;
    if (pendingPaymentOrderCount > 0)
      alerts.push({
        type: "payment",
        message: "Pending payments awaiting confirmation",
        count: pendingPaymentOrderCount,
      });

    if (revenue > 0 && expenseToRevenueRatio >= 80) {
      alerts.push({
        type: "expense",
        message: `Expenses are ${expenseToRevenueRatio}% of revenue — review costs`,
        count: expenseCount,
      });
    }

    if (netProfit < 0) {
      alerts.push({
        type: "expense",
        message: "Net profit is negative this period",
        count: 1,
      });
    }

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
      partiallyOutOfStockProductCount,
      totalInventoryValue,
      paymentAmounts,
      alerts,
      filteredOrders,
      paidOrders,
      expenseMetrics: {
        totalExpenses,
        netProfit,
        expenseToRevenueRatio,
        topExpenseCategory,
        expenseCategoryBreakdown,
        changePercentage: {
          expenses: calculateChange(totalExpenses, prevTotalExpenses),
          netProfit: calculateChange(netProfit, prevNetProfit),
        },
        averageExpenseAmount,
        expenseCount,
        expenseByPaymentMethod,
      },
    });
  }, [
    storeId,
    orders,
    products,
    expenses,
    timePeriod,
    getCurrentPeriodDates,
    getPreviousPeriodDates,
    isOrderPaid,
  ]);

  useEffect(() => {
    calculateAllMetrics();
  }, [calculateAllMetrics]);

  return metrics;
};
