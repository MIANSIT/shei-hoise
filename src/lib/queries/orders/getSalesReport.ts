import { supabase } from "@/lib/supabase";
import { OrderStatus } from "@/lib/types/enums";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09" → "Sep 2026" — no Date/timezone conversion needed since order_date is already a plain calendar date, not a UTC instant. */
function monthKeyToLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${MONTH_LABELS[Number(month) - 1] ?? month} ${year}`;
}

export interface SalesReportRow {
  /** Sortable YYYY-MM-DD or YYYY-MM key — also used to re-query this row's own orders for drill-down. */
  period_key: string;
  period_label: string;
  orders_count: number;
  revenue: number;
  online_revenue: number;
  pos_revenue: number;
}

export interface SalesReportResult {
  totalRevenue: number;
  totalOrders: number;
  onlineRevenue: number;
  posRevenue: number;
  averageOrderValue: number;
  rows: SalesReportRow[];
}

const EMPTY_RESULT: SalesReportResult = {
  totalRevenue: 0,
  totalOrders: 0,
  onlineRevenue: 0,
  posRevenue: 0,
  averageOrderValue: 0,
  rows: [],
};

/**
 * Sales for an arbitrary date range, grouped either per-day (for a single
 * day/week/month view) or per-month (for a year view, so it doesn't render
 * 365 rows) — plus an online-vs-Quick-Sale split via `orders.channel`.
 *
 * Grouped and filtered by `orders.order_date`, not `created_at`. order_date
 * is a plain `date` column an admin can set/back-date independently of when
 * the row was actually inserted (e.g. entering yesterday's paper Quick Sale
 * receipts today, or importing historical orders) — see the migration that
 * added it and resolveOrderInvoiceDate.ts, which already treats order_date
 * as the order's real date for invoices. Bucketing by created_at instead
 * would put a backdated order under today's date, not the day it actually
 * happened. Being a plain date (no time-of-day), order_date also needs no
 * timezone offset math the way a created_at timestamp comparison would.
 *
 * "Sales"/"revenue" here means net product revenue — `subtotal −
 * discount_amount` — not `total_amount`. `total_amount` also bundles in
 * `shipping_fee` and `tax_amount`, both of which are collected from the
 * customer only to be passed straight through (to the courier, to tax),
 * not actual sales revenue, so they're deliberately excluded. This is not
 * "just collected cash" either — a due Quick Sale order still counts in
 * full the moment the sale is made, even if payment is still pending (see
 * the Customer Dues page for that distinction).
 */
export async function getSalesReport(
  storeId: string,
  fromDate: string, // YYYY-MM-DD
  toDate: string,
  bucket: "day" | "month",
): Promise<SalesReportResult> {
  if (!storeId) return EMPTY_RESULT;

  // Paged, because a single request is capped at PGRST_DB_MAX_ROWS (1000) —
  // a store with more than 1000 non-cancelled orders in the selected range
  // (e.g. a "Year" view) would silently have every total (revenue, order
  // count, average order value) computed from only the first 1000.
  let orders: { subtotal: number; discount_amount: number; channel: string; order_date: string }[];
  try {
    orders = await fetchAllPaged((from, to) =>
      supabase
        .from("orders")
        .select("subtotal, discount_amount, channel, order_date")
        .eq("store_id", storeId)
        .neq("status", OrderStatus.CANCELLED)
        .neq("status", OrderStatus.RETURNED)
        .gte("order_date", fromDate)
        .lte("order_date", toDate)
        .range(from, to),
    );
  } catch (error) {
    console.error("Failed to load sales report:", error);
    return EMPTY_RESULT;
  }

  let totalRevenue = 0;
  let onlineRevenue = 0;
  let posRevenue = 0;

  // Grouped by a sortable key (YYYY-MM-DD or YYYY-MM) separate from the
  // human-readable label ("Sep 2026" would sort wrong alphabetically).
  const rowByKey = new Map<string, SalesReportRow>();

  for (const order of orders) {
    const amount = (Number(order.subtotal) || 0) - (Number(order.discount_amount) || 0);
    const isPos = order.channel === "pos";

    totalRevenue += amount;
    if (isPos) posRevenue += amount;
    else onlineRevenue += amount;

    const dateStr = order.order_date.slice(0, 10); // YYYY-MM-DD
    const key = bucket === "day" ? dateStr : dateStr.slice(0, 7);
    const label = bucket === "day" ? key : monthKeyToLabel(key);

    const row =
      rowByKey.get(key) ??
      ({
        period_key: key,
        period_label: label,
        orders_count: 0,
        revenue: 0,
        online_revenue: 0,
        pos_revenue: 0,
      } satisfies SalesReportRow);

    row.orders_count += 1;
    row.revenue += amount;
    if (isPos) row.pos_revenue += amount;
    else row.online_revenue += amount;

    rowByKey.set(key, row);
  }

  const rows = Array.from(rowByKey.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([, row]) => row);

  return {
    totalRevenue,
    totalOrders: orders.length,
    onlineRevenue,
    posRevenue,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    rows,
  };
}

export interface SalesReportOrderRow {
  order_number: string;
  customer_name: string;
  channel: "online" | "pos";
  revenue: number;
  created_at: string;
}

/**
 * The individual orders behind one SalesReportRow — lets the admin see
 * exactly which orders make up a given period's revenue number, drilled
 * down by expanding that row in the report table. Uses the exact same
 * revenue formula, status filter, and order_date-based date range as
 * getSalesReport so the sum of these rows always matches the aggregated
 * figure exactly.
 */
export async function getSalesReportOrdersForPeriod(
  storeId: string,
  fromDate: string,
  toDate: string,
): Promise<SalesReportOrderRow[]> {
  if (!storeId) return [];

  let data: unknown[];
  try {
    data = await fetchAllPaged((from, to) =>
      supabase
        .from("orders")
        .select("order_number, subtotal, discount_amount, channel, created_at, order_date, shipping_address, store_customers!customer_id(name)")
        .eq("store_id", storeId)
        .neq("status", OrderStatus.CANCELLED)
        .neq("status", OrderStatus.RETURNED)
        .gte("order_date", fromDate)
        .lte("order_date", toDate)
        .order("order_date", { ascending: false })
        .range(from, to),
    );
  } catch (error) {
    console.error("Failed to load sales report period orders:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((order: any) => {
    const customerData = order.store_customers;
    const customer = Array.isArray(customerData) ? customerData[0] : customerData;

    return {
      order_number: order.order_number,
      customer_name: order.shipping_address?.customer_name || customer?.name || "Unknown Customer",
      channel: order.channel === "pos" ? "pos" : "online",
      revenue: (Number(order.subtotal) || 0) - (Number(order.discount_amount) || 0),
      created_at: order.created_at,
    };
  });
}
