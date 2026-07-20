// app/hooks/useDashboardMetrics.ts
import { useMemo } from "react";
import type { DashboardSummaryPayload } from "@/lib/queries/dashboard/getDashboardSummary";

export type TimePeriod = "weekly" | "monthly" | "yearly";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";
export type AlertType = "stock" | "order" | "payment" | "expense";

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
  expenseCount: number;
}

interface DashboardMetrics {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  grossProfit: number;
  paidOrdersCount: number;
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
  }[];
  inStockCount: number;
  lowStockProductCount: number;
  outOfStockProductCount: number;
  partiallyOutOfStockProductCount: number;
  totalInventoryValue: number;
  paymentAmounts: Record<PaymentStatus, number>;
  alerts: { type: AlertType; message: string; count: number }[];
  expenseMetrics: ExpenseMetrics;
}

const defaultExpenseMetrics: ExpenseMetrics = {
  totalExpenses: 0,
  netProfit: 0,
  expenseToRevenueRatio: 0,
  topExpenseCategory: { name: "None", amount: 0 },
  expenseCategoryBreakdown: [],
  changePercentage: { expenses: 0, netProfit: 0 },
  expenseCount: 0,
};

const emptyMetrics: DashboardMetrics = {
  revenue: 0,
  orderCount: 0,
  averageOrderValue: 0,
  grossProfit: 0,
  paidOrdersCount: 0,
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
    topCustomer: { name: "No customers", totalSpent: 0 },
  },
  topProducts: [],
  inStockCount: 0,
  lowStockProductCount: 0,
  outOfStockProductCount: 0,
  partiallyOutOfStockProductCount: 0,
  totalInventoryValue: 0,
  paymentAmounts: { paid: 0, pending: 0, refunded: 0 },
  alerts: [],
  expenseMetrics: defaultExpenseMetrics,
};

// previous === 0 is treated as "no prior baseline": any positive current
// value reads as +100%, matching how the client-computed version behaved.
const calculateChange = (current: number, previous: number): number =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

/**
 * Formats the pre-aggregated get_dashboard_summary RPC payload into the
 * shape the dashboard UI expects. All revenue/profit/inventory/trend
 * computation now happens in Postgres (see supabase/migrations
 * 20260719000003-20260719000007) — this hook only does small arithmetic
 * that doesn't belong in SQL (percentage changes, ratios, alert text).
 * @returns Dashboard metrics ready to render, or a zeroed shape while loading.
 */
export const useDashboardMetrics = (
  summary: DashboardSummaryPayload | null,
): DashboardMetrics => {
  return useMemo(() => {
    if (!summary) return emptyMetrics;

    const currentAOV =
      summary.order_count > 0 ? summary.order_value_sum / summary.order_count : 0;
    const prevAOV =
      summary.prev_order_count > 0
        ? summary.prev_order_value_sum / summary.prev_order_count
        : 0;

    const vendorProfit = summary.vendor_profit ?? 0;
    const prevVendorProfit = summary.prev_vendor_profit ?? 0;
    const netProfit =
      summary.gross_profit + vendorProfit - summary.expense_metrics.total_expenses;
    const prevNetProfit =
      summary.prev_gross_profit + prevVendorProfit - summary.expense_metrics.prev_total_expenses;

    const expenseToRevenueRatio =
      summary.revenue > 0
        ? parseFloat(
            ((summary.expense_metrics.total_expenses / summary.revenue) * 100).toFixed(1),
          )
        : 0;

    const expenseCategoryBreakdown = summary.expense_metrics.expense_category_breakdown.map(
      (c) => ({
        name: c.name,
        amount: c.amount,
        percentage:
          summary.expense_metrics.total_expenses > 0
            ? parseFloat(
                ((c.amount / summary.expense_metrics.total_expenses) * 100).toFixed(1),
              )
            : 0,
      }),
    );

    const salesTrend = summary.sales_trend.map(({ date, sales }) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      sales,
    }));

    const alerts: DashboardMetrics["alerts"] = [];

    if (summary.inventory.out_of_stock_product_count > 0)
      alerts.push({
        type: "stock",
        message: "Products completely out of stock",
        count: summary.inventory.out_of_stock_product_count,
      });

    if (summary.inventory.partially_out_of_stock_product_count > 0)
      alerts.push({
        type: "stock",
        message: "Products with some variants out of stock",
        count: summary.inventory.partially_out_of_stock_product_count,
      });

    if (summary.inventory.low_stock_product_count > 0)
      alerts.push({
        type: "stock",
        message: "Low stock products need attention",
        count: summary.inventory.low_stock_product_count,
      });

    if (summary.order_status_counts.pending > 0)
      alerts.push({
        type: "order",
        message: "Pending orders require action",
        count: summary.order_status_counts.pending,
      });

    if (summary.pending_payment_order_count > 0)
      alerts.push({
        type: "payment",
        message: "Pending payments awaiting confirmation",
        count: summary.pending_payment_order_count,
      });

    if (summary.revenue > 0 && expenseToRevenueRatio >= 80) {
      alerts.push({
        type: "expense",
        message: `Expenses are ${expenseToRevenueRatio}% of revenue — review costs`,
        count: summary.expense_metrics.expense_count,
      });
    }

    if (netProfit < 0) {
      alerts.push({
        type: "expense",
        message: "Net profit is negative this period",
        count: 1,
      });
    }

    return {
      revenue: summary.revenue,
      orderCount: summary.order_count,
      averageOrderValue: currentAOV,
      grossProfit: summary.gross_profit,
      paidOrdersCount: summary.paid_orders_count,
      changePercentage: {
        revenue: calculateChange(summary.revenue, summary.prev_revenue),
        orders: calculateChange(summary.order_count, summary.prev_order_count),
        aov: calculateChange(currentAOV, prevAOV),
        profit: calculateChange(summary.gross_profit, summary.prev_gross_profit),
      },
      orderStatusCounts: summary.order_status_counts,
      salesTrend,
      customerSnapshot: {
        newCustomers: summary.customer_snapshot.new_customers,
        returningRate: summary.customer_snapshot.returning_rate,
        topCustomer: {
          name: summary.customer_snapshot.top_customer.name,
          totalSpent: summary.customer_snapshot.top_customer.total_spent,
        },
      },
      topProducts: summary.top_products,
      inStockCount: summary.inventory.in_stock_units,
      lowStockProductCount: summary.inventory.low_stock_product_count,
      outOfStockProductCount: summary.inventory.out_of_stock_product_count,
      partiallyOutOfStockProductCount:
        summary.inventory.partially_out_of_stock_product_count,
      totalInventoryValue: summary.inventory.total_inventory_value,
      paymentAmounts: summary.payment_amounts,
      alerts,
      expenseMetrics: {
        totalExpenses: summary.expense_metrics.total_expenses,
        netProfit,
        expenseToRevenueRatio,
        topExpenseCategory: summary.expense_metrics.top_expense_category,
        expenseCategoryBreakdown,
        changePercentage: {
          expenses: calculateChange(
            summary.expense_metrics.total_expenses,
            summary.expense_metrics.prev_total_expenses,
          ),
          netProfit: calculateChange(netProfit, prevNetProfit),
        },
        expenseCount: summary.expense_metrics.expense_count,
      },
    };
  }, [summary]);
};
