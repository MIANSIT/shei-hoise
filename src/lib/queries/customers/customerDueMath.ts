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
