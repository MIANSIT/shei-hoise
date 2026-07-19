import { supabase } from "@/lib/supabase";

export interface DashboardSummaryPayload {
  revenue: number;
  prev_revenue: number;
  order_count: number;
  prev_order_count: number;
  order_value_sum: number;
  prev_order_value_sum: number;
  paid_orders_count: number;
  pending_payment_order_count: number;
  gross_profit: number;
  prev_gross_profit: number;
  order_status_counts: {
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  payment_amounts: {
    pending: number;
    paid: number;
    refunded: number;
  };
  sales_trend: { date: string; sales: number }[];
  top_products: { name: string; revenue: number; quantity: number }[];
  customer_snapshot: {
    new_customers: number;
    returning_rate: number;
    top_customer: { name: string; total_spent: number };
  };
  inventory: {
    in_stock_units: number;
    low_stock_product_count: number;
    out_of_stock_product_count: number;
    partially_out_of_stock_product_count: number;
    total_inventory_value: number;
  };
  expense_metrics: {
    total_expenses: number;
    prev_total_expenses: number;
    expense_count: number;
    top_expense_category: { name: string; amount: number };
    expense_category_breakdown: { name: string; amount: number }[];
  };
}

/**
 * Fetches every dashboard metric in one call via the get_dashboard_summary
 * Postgres RPC — revenue, profit, inventory, alerts, top products, and
 * customer stats are all pre-aggregated in the database instead of being
 * recomputed from raw orders/products/expenses on every page load.
 * @returns The full dashboard summary payload for the given store and period.
 */
export async function getDashboardSummary(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
): Promise<DashboardSummaryPayload> {
  const { data, error } = await supabase.rpc("get_dashboard_summary", {
    p_store_id: storeId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_prev_period_start: prevPeriodStart,
    p_prev_period_end: prevPeriodEnd,
  });

  if (error) throw new Error(error.message);
  return data as DashboardSummaryPayload;
}
