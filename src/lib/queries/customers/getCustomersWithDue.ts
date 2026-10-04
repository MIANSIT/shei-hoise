import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { computeBranchOrderBalances } from "./customerDueMath";

export interface CustomerWithDue {
  /** Unique per row: one row per customer, or per customer and branch for stores with branches. */
  row_key: string;
  customer_id: string;
  /** Stores with branches: the branch this due is owed to. */
  branch_id: string | null;
  name: string | null;
  phone: string | null;
  total_due: number;
  oldest_due_date: string;
}

/**
 * Every customer at this store who currently owes something, for the
 * Customer Dues list. Stores with branches get one row per customer and
 * branch (pass branchId for one branch only).
 */
export async function getCustomersWithDue(
  storeId: string,
  branchId?: string | null,
  /** Read branch columns (stores with branches). */
  withBranches = false,
): Promise<CustomerWithDue[]> {
  if (!storeId) return [];

  const [ordersRes, paymentsRes] = await Promise.all([
    // Excludes already-`paid` orders — an order marked paid outside the due
    // system (e.g. a normal order, or the classic manual "mark as paid"
    // dropdown) has no customer_payments rows at all, so the ledger alone
    // would otherwise make it look 100% unpaid instead of not due.
    supabase
      .from("orders")
      .select(withBranches ? "id, customer_id, total_amount, created_at, branch_id" : "id, customer_id, total_amount, created_at")
      .eq("store_id", storeId)
      .not("customer_id", "is", null)
      .neq("payment_status", PaymentStatus.PAID)
      // A returned order that was auto-refunded shouldn't reappear as an
      // outstanding due once its refund row pushes due_remaining back up.
      .neq("payment_status", PaymentStatus.REFUNDED)
      // A cancelled or returned order was never fulfilled, so it isn't a
      // debt the customer owes — without this, a cancelled order whose
      // payment failed (never paid, never refunded) stayed in every
      // customer's due total forever.
      .neq("status", OrderStatus.CANCELLED)
      .neq("status", OrderStatus.RETURNED)
      // Online COD isn't a customer due — the courier collects it and hands it
      // over in a COD settlement (counted under COD pending), so including it
      // here showed the same money twice.
      .or("payment_method.is.null,payment_method.neq.cod,channel.eq.pos")
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_payments")
      .select(withBranches ? "amount, order_id, customer_id, branch_id" : "amount, order_id, customer_id")
      .eq("store_id", storeId),
  ]);

  type OrderRow = { id: string; customer_id: string | null; total_amount: number; created_at: string; branch_id?: string | null };
  type PaymentRow = { amount: number; order_id: string | null; customer_id: string | null; branch_id?: string | null };
  const orders = (ordersRes.data ?? []) as unknown as OrderRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];

  const ordersByCustomer = new Map<string, typeof orders>();
  for (const order of orders) {
    if (!order.customer_id) continue;
    const list = ordersByCustomer.get(order.customer_id) ?? [];
    list.push(order);
    ordersByCustomer.set(order.customer_id, list);
  }

  const paymentsByCustomer = new Map<string, typeof payments>();
  for (const payment of payments) {
    if (!payment.customer_id) continue;
    const list = paymentsByCustomer.get(payment.customer_id) ?? [];
    list.push(payment);
    paymentsByCustomer.set(payment.customer_id, list);
  }

  const dueByCustomer: { customer_id: string; branch_id: string | null; total_due: number; oldest_due_date: string }[] = [];

  for (const [customerId, customerOrders] of ordersByCustomer) {
    const balances = computeBranchOrderBalances(
      customerOrders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount), branch_id: o.branch_id ?? null })),
      paymentsByCustomer.get(customerId) ?? [],
    );
    const balanceByOrderId = new Map(balances.map((b) => [b.order_id, b]));

    // One total per branch (a single null-branch total for stores without branches).
    const perBranch = new Map<string, { total: number; oldest: string | null }>();
    for (const order of customerOrders) {
      const orderBranch = order.branch_id ?? null;
      if (branchId && orderBranch !== branchId) continue;
      const due = balanceByOrderId.get(order.id)?.due_remaining ?? 0;
      if (due <= 0.01) continue;
      const key = orderBranch ?? "";
      const entry = perBranch.get(key) ?? { total: 0, oldest: null };
      entry.total += due;
      if (!entry.oldest) entry.oldest = order.created_at;
      perBranch.set(key, entry);
    }

    for (const [key, entry] of perBranch) {
      if (entry.total > 0.01 && entry.oldest) {
        dueByCustomer.push({
          customer_id: customerId,
          branch_id: key || null,
          total_due: entry.total,
          oldest_due_date: entry.oldest,
        });
      }
    }
  }

  if (dueByCustomer.length === 0) return [];

  const { data: customers } = await supabase
    .from("store_customers")
    .select("id, name, phone")
    .in(
      "id",
      dueByCustomer.map((d) => d.customer_id),
    );

  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  return dueByCustomer
    .map((d) => ({
      row_key: `${d.customer_id}:${d.branch_id ?? ""}`,
      customer_id: d.customer_id,
      branch_id: d.branch_id,
      name: customerMap.get(d.customer_id)?.name ?? null,
      phone: customerMap.get(d.customer_id)?.phone ?? null,
      total_due: d.total_due,
      oldest_due_date: d.oldest_due_date,
    }))
    .sort((a, b) => new Date(a.oldest_due_date).getTime() - new Date(b.oldest_due_date).getTime());
}
