import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { computeOrderBalances } from "@/lib/queries/customers/customerDueMath";
import { getCodCashSettledForDate } from "@/lib/queries/orders/codSettlements";

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
  /** SUM(subtotal - discount_amount) for the day's orders — what went out the door, whether or not it's all been collected yet. Same "net product revenue" definition as the Sales Report (excludes shipping_fee and tax_amount, both pass-through, not earned revenue) — previously this summed the raw total_amount instead, so Gross Sales here and Total Sales on the Sales Report could show two different numbers for the identical day. */
  grossSales: number;
  /** What actually came in today, by payment method — see the function doc for how due sales fold in without double-counting. */
  collectedByMethod: Record<string, number>;
  /** Still owed from today's own due sales, right now (a same-day partial collection is already netted out). */
  dueOutstanding: number;
  /** Every customer_payments row dated today, any method, whether against a brand-new due sale or an older one — the total due collection activity for the day. */
  dueCollectedToday: number;
  /** COD cash a courier actually handed over today, from settlements recorded against this date — see codSettlements.ts. Independent of when the covered orders were originally sold. */
  codCashSettled: number;
  orders: QuickSaleDailyOrderRow[];
}

const EMPTY: QuickSaleDailySummary = {
  transactionCount: 0,
  grossSales: 0,
  collectedByMethod: {},
  dueOutstanding: 0,
  dueCollectedToday: 0,
  codCashSettled: 0,
  orders: [],
};

/**
 * One day's cash-register summary — gross sales, what actually came in by
 * payment method, and what's still owed from today's due sales. Cancelled
 * sales are excluded (no goods left, no money should have moved).
 *
 * Covers every channel, not just Quick Sale/POS: an online order can also
 * be paid in cash and physically land in the same drawer (e.g. picked up
 * in-store), and there's no reliable way to tell that apart from a courier
 * order whose cash the courier holds instead — so this counts every order
 * regardless of channel, same as the store's own reconciliation process
 * does. The "collected by payment method" breakdown below is what actually
 * answers "how much cash should be in the drawer," not the channel.
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

  // Filters on order_date (when the sale actually happened — a plain date,
  // independently settable from created_at, see getCustomerOrderHistory.ts),
  // not created_at (when the row was written). A Quick Sale entered for an
  // earlier transaction, or an order edited after the fact, keeps its own
  // order_date — filtering by created_at would silently drop it from (or
  // wrongly add it to) the day it actually belongs to for cash reconciliation.
  // Still sorted by created_at for a sensible within-day sequence, since
  // order_date alone has no time-of-day to order by.
  const [ordersRes, paymentsRes, codCashSettled] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, created_at, total_amount, subtotal, discount_amount, payment_method, payment_status, status, shipping_address",
      )
      .eq("store_id", storeId)
      .neq("status", OrderStatus.CANCELLED)
      .neq("status", OrderStatus.RETURNED)
      .eq("order_date", dateStr)
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_payments")
      .select("order_id, amount, payment_method")
      .eq("store_id", storeId)
      .eq("payment_date", dateStr),
    // A settlement can land on a day with no Quick Sale/order activity of
    // its own (e.g. a courier payout day with nothing newly sold), so this
    // is fetched unconditionally rather than folded into the early-return
    // guard below.
    getCodCashSettledForDate(storeId, dateStr),
  ]);

  const orders = ordersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  if (orders.length === 0 && payments.length === 0 && codCashSettled === 0) return EMPTY;

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
    // Same net-revenue definition as getSalesReport.ts — excludes
    // shipping_fee and tax_amount, both pass-through rather than earned
    // sales. "Collected by method" below still uses the real total (`total`,
    // not `netRevenue`) since that has to reconcile against actual cash
    // changing hands, shipping fee included.
    const netRevenue = (Number(order.subtotal) || 0) - (Number(order.discount_amount) || 0);
    grossSales += netRevenue;
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
    codCashSettled,
    orders: rows,
  };
}
