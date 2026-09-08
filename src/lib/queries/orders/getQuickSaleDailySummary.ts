import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { computeOrderBalances } from "@/lib/queries/customers/customerDueMath";

export interface QuickSaleDailyOrderRow {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  payment_method: string | null;
  payment_status: PaymentStatus;
  status: OrderStatus;
  total_amount: number;
  due_remaining: number;
}

export interface QuickSaleDailySummary {
  transactionCount: number;
  /** SUM(total_amount) for the day's Quick Sale orders — what went out the door, whether or not it's all been collected yet. */
  grossSales: number;
  /** What actually came in today, by payment method — see the function doc for how due sales fold in without double-counting. */
  collectedByMethod: Record<string, number>;
  /** Still owed from today's own due sales, right now (a same-day partial collection is already netted out). */
  dueOutstanding: number;
  /** Every customer_payments row dated today, any method, whether against a brand-new due sale or an older one — the total due collection activity for the day. */
  dueCollectedToday: number;
  orders: QuickSaleDailyOrderRow[];
}

const EMPTY: QuickSaleDailySummary = {
  transactionCount: 0,
  grossSales: 0,
  collectedByMethod: {},
  dueOutstanding: 0,
  dueCollectedToday: 0,
  orders: [],
};

/**
 * One day's Quick Sale (POS) register summary, for an end-of-shift cash
 * count — gross sales, what actually came in by payment method, and what's
 * still owed from today's due sales. Cancelled sales are excluded (no goods
 * left, no money should have moved).
 *
 * "Collected by method" folds customer_payments in too, not just
 * payment_status='paid' orders — a due sale's "amount received now" only
 * ever lives in customer_payments (see recordCustomerPayment.ts), and a
 * due order from *any* day that gets paid down today puts real cash in
 * today's drawer regardless of when the original sale happened. The one
 * case that would double-count — a due sale toggled on but paid in full
 * immediately, which both counts its total_amount directly (payment_status
 * ends up 'paid') and gets a customer_payments row — is excluded from the
 * fold-in via `paidOrderIds`.
 */
export async function getQuickSaleDailySummary(
  storeId: string,
  dateStr: string, // YYYY-MM-DD, Asia/Dhaka
): Promise<QuickSaleDailySummary> {
  if (!storeId) return EMPTY;

  // Explicit +06:00 (Dhaka has no DST) — same day-boundary convention as
  // getSalesReport.ts, so this view and the Sales Report never disagree
  // about which calendar day an order near midnight falls on.
  const [ordersRes, paymentsRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, created_at, total_amount, payment_method, payment_status, status, shipping_address",
      )
      .eq("store_id", storeId)
      .eq("channel", "pos")
      .neq("status", OrderStatus.CANCELLED)
      .gte("created_at", `${dateStr}T00:00:00+06:00`)
      .lte("created_at", `${dateStr}T23:59:59.999+06:00`)
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_payments")
      .select("order_id, amount, payment_method")
      .eq("store_id", storeId)
      .eq("payment_date", dateStr),
  ]);

  const orders = ordersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  if (orders.length === 0 && payments.length === 0) return EMPTY;

  const paidOrderIds = new Set(
    orders.filter((o) => o.payment_status === PaymentStatus.PAID).map((o) => o.id),
  );

  const collectedByMethod: Record<string, number> = {};
  const addCollected = (method: string | null, amount: number) => {
    const key = method || "unknown";
    collectedByMethod[key] = (collectedByMethod[key] ?? 0) + amount;
  };

  let grossSales = 0;
  for (const order of orders) {
    const total = Number(order.total_amount) || 0;
    grossSales += total;
    if (order.payment_status === PaymentStatus.PAID) {
      addCollected(order.payment_method, total);
    }
  }

  let dueCollectedToday = 0;
  for (const payment of payments) {
    const amount = Number(payment.amount) || 0;
    dueCollectedToday += amount;
    // Already folded in above via total_amount — see the function doc.
    if (payment.order_id && paidOrderIds.has(payment.order_id)) continue;
    addCollected(payment.payment_method, amount);
  }

  // due_remaining for today's own not-yet-fully-paid sales, via the same
  // waterfall every other due balance in the app uses (customerDueMath.ts)
  // — `orders` is already oldest-first from the query above, as that math
  // requires.
  const dueOrders = orders.filter((o) => o.payment_status !== PaymentStatus.PAID);
  const dueOrderIds = new Set(dueOrders.map((o) => o.id));
  const balances = computeOrderBalances(
    dueOrders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount) })),
    payments
      .filter((p) => p.order_id && dueOrderIds.has(p.order_id))
      .map((p) => ({ order_id: p.order_id, amount: Number(p.amount) })),
  );
  const dueRemainingByOrderId = new Map(balances.map((b) => [b.order_id, b.due_remaining]));
  const dueOutstanding = balances.reduce((sum, b) => sum + Math.max(0, b.due_remaining), 0);

  const rows: QuickSaleDailyOrderRow[] = orders.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    customer_name: order.shipping_address?.customer_name || "Walk-in Customer",
    customer_phone: order.shipping_address?.phone || "",
    payment_method: order.payment_method,
    payment_status: order.payment_status as PaymentStatus,
    status: order.status as OrderStatus,
    total_amount: Number(order.total_amount) || 0,
    due_remaining: Math.max(0, dueRemainingByOrderId.get(order.id) ?? 0),
  }));

  return {
    transactionCount: orders.length,
    grossSales,
    collectedByMethod,
    dueOutstanding,
    dueCollectedToday,
    orders: rows,
  };
}
