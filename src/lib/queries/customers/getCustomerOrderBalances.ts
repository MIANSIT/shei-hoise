import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { computeBranchOrderBalances } from "./customerDueMath";

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
  /** Stores with branches: only orders of this branch (balances are per branch either way). */
  branchId?: string | null,
  /** Read branch columns (stores with branches). */
  withBranches = false,
  /** Customer Dues page: leave out online COD orders (the courier's to hand over, not a customer due). */
  excludeCourierCod = false,
): Promise<CustomerOrderBalance[]> {
  if (!storeId || !customerId) return [];

  let ordersQuery = supabase
    .from("orders")
    .select(withBranches ? "id, order_number, created_at, total_amount, branch_id" : "id, order_number, created_at, total_amount")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .neq("payment_status", PaymentStatus.PAID)
    .neq("payment_status", PaymentStatus.REFUNDED)
    .neq("status", OrderStatus.CANCELLED)
    .neq("status", OrderStatus.RETURNED);
  if (excludeCourierCod) {
    ordersQuery = ordersQuery.or("payment_method.is.null,payment_method.neq.cod,channel.eq.pos");
  }

  const [ordersRes, paymentsRes] = await Promise.all([
    // Excludes already-`paid` orders — an order marked paid outside the due
    // system (e.g. a normal order, or the classic manual "mark as paid"
    // dropdown) has no customer_payments rows at all, so the ledger alone
    // would otherwise make it look 100% unpaid instead of not due.
    ordersQuery.order("created_at", { ascending: true }),
    supabase
      .from("customer_payments")
      .select(withBranches ? "amount, order_id, branch_id" : "amount, order_id")
      .eq("store_id", storeId)
      .eq("customer_id", customerId),
  ]);

  type OrderRow = { id: string; order_number: string; created_at: string; total_amount: number; branch_id?: string | null };
  type PaymentRow = { amount: number; order_id: string | null; branch_id?: string | null };
  const allOrders = (ordersRes.data ?? []) as unknown as OrderRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];

  const balances = computeBranchOrderBalances(
    allOrders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount), branch_id: o.branch_id ?? null })),
    payments,
  );
  const orders = branchId ? allOrders.filter((o) => o.branch_id === branchId) : allOrders;
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
