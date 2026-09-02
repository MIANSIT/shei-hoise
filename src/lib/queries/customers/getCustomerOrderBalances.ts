import { supabase } from "@/lib/supabase";
import { PaymentStatus } from "@/lib/types/enums";
import { computeOrderBalances } from "./customerDueMath";

export interface CustomerOrderBalance {
  order_id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  paid_allocated: number;
  due_remaining: number;
}

/** Per-order due for one customer at this store — powers the "Apply to Order" picker in the collect-payment modal. Mirrors getVendorInvoiceBalances.ts. */
export async function getCustomerOrderBalances(
  storeId: string,
  customerId: string,
): Promise<CustomerOrderBalance[]> {
  if (!storeId || !customerId) return [];

  const [ordersRes, paymentsRes] = await Promise.all([
    // Excludes already-`paid` orders — an order marked paid outside the due
    // system (e.g. a normal order, or the classic manual "mark as paid"
    // dropdown) has no customer_payments rows at all, so the ledger alone
    // would otherwise make it look 100% unpaid instead of not due.
    supabase
      .from("orders")
      .select("id, order_number, created_at, total_amount")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .neq("payment_status", PaymentStatus.PAID)
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_payments")
      .select("amount, order_id")
      .eq("store_id", storeId)
      .eq("customer_id", customerId),
  ]);

  const orders = ordersRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const balances = computeOrderBalances(
    orders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount) })),
    payments,
  );
  const balanceByOrderId = new Map(balances.map((b) => [b.order_id, b]));

  // Computed oldest-first (the waterfall applies in that order); display newest-first.
  return orders
    .map((order) => {
      const balance = balanceByOrderId.get(order.id)!;
      return {
        order_id: order.id,
        order_number: order.order_number,
        order_date: order.created_at,
        total_amount: Number(order.total_amount),
        paid_allocated: balance.paid_allocated,
        due_remaining: balance.due_remaining,
      };
    })
    .reverse();
}
