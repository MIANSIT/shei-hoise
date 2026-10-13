// Pure waterfall math shared by every "how much does this customer/order
// owe" query, so it behaves identically whether it's read with the
// anon-key client (RLS-authenticated browser reads) or the service-role
// client (server-side mutations) — see getCustomerOrderBalances.ts,
// getCustomersWithDue.ts, and recordCustomerPayment.ts.
//
// A payment pinned to a specific order (order_id set) pays that order down
// first; any leftover/unpinned amount pools and applies oldest-order-first —
// mirrors getVendorInvoiceBalances.ts's exact algorithm for vendor dues.
export interface DueOrder {
  id: string;
  total_amount: number;
}

export interface DuePayment {
  order_id: string | null;
  amount: number;
}

export interface OrderBalance {
  order_id: string;
  paid_allocated: number;
  due_remaining: number;
}

/** `orders` must already be sorted oldest-first for the pool waterfall to land correctly. */
export function computeOrderBalances(
  orders: DueOrder[],
  payments: DuePayment[],
): OrderBalance[] {
  const pinnedByOrder = new Map<string, number>();
  let pool = 0;
  for (const payment of payments) {
    const amount = Number(payment.amount);
    if (payment.order_id) {
      pinnedByOrder.set(payment.order_id, (pinnedByOrder.get(payment.order_id) ?? 0) + amount);
    } else {
      pool += amount;
    }
  }

  return orders.map((order) => {
    const total = Number(order.total_amount);
    const pinned = pinnedByOrder.get(order.id) ?? 0;
    const remainingAfterPinned = total - pinned;

    let fromPool = 0;
    if (remainingAfterPinned > 0) {
      fromPool = Math.min(remainingAfterPinned, Math.max(pool, 0));
      pool -= fromPool;
    }

    const paidAllocated = pinned + fromPool;
    return {
      order_id: order.id,
      paid_allocated: paidAllocated,
      due_remaining: total - paidAllocated,
    };
  });
}

const SETTLED_AFTER_MS = 60_000;
/** How soon after a customer payment an order can be updated and still count as settled by it. */
const PAYMENT_TOUCH_WINDOW_MS = 120_000;

/**
 * A paid order that was settled out of the customer's ledger payments rather
 * than at the sale. Such orders must stay in the waterfall, or the payment
 * that settled them gets applied again to the orders that are still unpaid and
 * hides that due. Orders paid at the counter never used the ledger.
 * - With paid_at: marked paid well after it was created.
 * - Without paid_at (paid before that column existed): updated within a couple
 *   of minutes after one of this customer's payments, which is when recording a
 *   payment marks an order paid.
 * Same rule as is_ledger_settled_order in the database.
 * @param paymentCreatedAt created_at of this customer's payments
 */
export function isLedgerSettledOrder(
  order: {
    payment_status: string;
    paid_at?: string | null;
    created_at: string;
    updated_at?: string | null;
  },
  paymentCreatedAt: readonly string[] = [],
): boolean {
  if (order.payment_status !== "paid") return false;
  const created = new Date(order.created_at).getTime();
  if (order.paid_at) return new Date(order.paid_at).getTime() - created > SETTLED_AFTER_MS;
  if (!order.updated_at) return false;
  const updated = new Date(order.updated_at).getTime();
  if (updated - created <= SETTLED_AFTER_MS) return false;
  return paymentCreatedAt.some((p) => {
    const gap = updated - new Date(p).getTime();
    return gap >= -1000 && gap <= PAYMENT_TOUCH_WINDOW_MS;
  });
}

export interface BranchDueOrder extends DueOrder {
  branch_id?: string | null;
}

export interface BranchDuePayment extends DuePayment {
  branch_id?: string | null;
}

/**
 * computeOrderBalances, run separately for each branch (stores with
 * branches): a customer can owe Dhanmondi and Uttara different amounts, and
 * money paid at one branch only pays down that branch's orders. A payment
 * pinned to an order follows that order's branch; an unpinned one stays in
 * the branch that took it. Stores without branches have one group (every
 * branch_id is null), so the result is exactly computeOrderBalances.
 * `orders` must be oldest-first, as for computeOrderBalances.
 */
export function computeBranchOrderBalances(
  orders: BranchDueOrder[],
  payments: BranchDuePayment[],
): OrderBalance[] {
  const branchOfOrder = new Map(orders.map((o) => [o.id, o.branch_id ?? null]));
  const groups = new Map<string, { orders: DueOrder[]; payments: DuePayment[] }>();
  const groupFor = (branchId: string | null) => {
    const key = branchId ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { orders: [], payments: [] };
      groups.set(key, group);
    }
    return group;
  };

  for (const order of orders) groupFor(order.branch_id ?? null).orders.push(order);
  for (const payment of payments) {
    const branchId =
      payment.order_id && branchOfOrder.has(payment.order_id)
        ? (branchOfOrder.get(payment.order_id) ?? null)
        : (payment.branch_id ?? null);
    groupFor(branchId).payments.push(payment);
  }

  const byOrderId = new Map<string, OrderBalance>();
  for (const group of groups.values()) {
    for (const balance of computeOrderBalances(group.orders, group.payments)) {
      byOrderId.set(balance.order_id, balance);
    }
  }
  return orders.map((o) => byOrderId.get(o.id)!);
}
