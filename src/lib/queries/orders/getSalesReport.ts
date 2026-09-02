import { supabase } from "@/lib/supabase";
import { OrderStatus } from "@/lib/types/enums";

const STORE_TIMEZONE = "Asia/Dhaka";

const toDhakaDateString = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const toDhakaMonthKey = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  })
    .format(date)
    .replace(/\//g, "-"); // en-CA gives YYYY-MM already, but normalize just in case

const toDhakaMonthLabel = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "short",
  }).format(date);

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
  fromDate: string, // YYYY-MM-DD, Asia/Dhaka
  toDate: string,
  bucket: "day" | "month",
): Promise<SalesReportResult> {
  if (!storeId) return EMPTY_RESULT;

  // Explicit +06:00 (Dhaka has no DST, so this offset is always correct) —
  // without it, Postgres/PostgREST would interpret these as UTC, shifting
  // the day boundary by 6 hours and miscounting orders near midnight.
  const { data, error } = await supabase
    .from("orders")
    .select("subtotal, discount_amount, channel, created_at")
    .eq("store_id", storeId)
    .neq("status", OrderStatus.CANCELLED)
    .gte("created_at", `${fromDate}T00:00:00+06:00`)
    .lte("created_at", `${toDate}T23:59:59.999+06:00`);

  if (error) {
    console.error("Failed to load sales report:", error);
    return EMPTY_RESULT;
  }

  const orders = data ?? [];

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

    const createdAt = new Date(order.created_at);
    const key = bucket === "day" ? toDhakaDateString(createdAt) : toDhakaMonthKey(createdAt);
    const label = bucket === "day" ? key : toDhakaMonthLabel(createdAt);

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
 * revenue formula and status filter as getSalesReport so the sum of these
 * rows always matches the aggregated figure.
 */
export async function getSalesReportOrdersForPeriod(
  storeId: string,
  fromDate: string,
  toDate: string,
): Promise<SalesReportOrderRow[]> {
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("order_number, subtotal, discount_amount, channel, created_at, shipping_address, store_customers!customer_id(name)")
    .eq("store_id", storeId)
    .neq("status", OrderStatus.CANCELLED)
    .gte("created_at", `${fromDate}T00:00:00+06:00`)
    .lte("created_at", `${toDate}T23:59:59.999+06:00`)
    .order("created_at", { ascending: false });

  if (error) {
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
