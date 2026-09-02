import { supabase } from "@/lib/supabase";
import { PaymentStatus } from "@/lib/types/enums";
import { computeOrderBalances } from "./customerDueMath";

export interface CustomerWithDue {
  customer_id: string;
  name: string | null;
  phone: string | null;
  total_due: number;
  oldest_due_date: string;
}

/** Every customer at this store who currently owes something, for the Customer Dues list. */
export async function getCustomersWithDue(storeId: string): Promise<CustomerWithDue[]> {
  if (!storeId) return [];

  const [ordersRes, paymentsRes] = await Promise.all([
    // Excludes already-`paid` orders — an order marked paid outside the due
    // system (e.g. a normal order, or the classic manual "mark as paid"
    // dropdown) has no customer_payments rows at all, so the ledger alone
    // would otherwise make it look 100% unpaid instead of not due.
    supabase
      .from("orders")
      .select("id, customer_id, total_amount, created_at")
      .eq("store_id", storeId)
      .not("customer_id", "is", null)
      .neq("payment_status", PaymentStatus.PAID)
      .order("created_at", { ascending: true }),
    supabase.from("customer_payments").select("amount, order_id, customer_id").eq("store_id", storeId),
  ]);

  const orders = ordersRes.data ?? [];
  const payments = paymentsRes.data ?? [];

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

  const dueByCustomer: { customer_id: string; total_due: number; oldest_due_date: string }[] = [];

  for (const [customerId, customerOrders] of ordersByCustomer) {
    const balances = computeOrderBalances(
      customerOrders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount) })),
      paymentsByCustomer.get(customerId) ?? [],
    );
    const balanceByOrderId = new Map(balances.map((b) => [b.order_id, b]));

    let totalDue = 0;
    let oldestDueDate: string | null = null;
    for (const order of customerOrders) {
      const due = balanceByOrderId.get(order.id)?.due_remaining ?? 0;
      if (due > 0.01) {
        totalDue += due;
        if (!oldestDueDate) oldestDueDate = order.created_at;
      }
    }

    if (totalDue > 0.01 && oldestDueDate) {
      dueByCustomer.push({ customer_id: customerId, total_due: totalDue, oldest_due_date: oldestDueDate });
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
      customer_id: d.customer_id,
      name: customerMap.get(d.customer_id)?.name ?? null,
      phone: customerMap.get(d.customer_id)?.phone ?? null,
      total_due: d.total_due,
      oldest_due_date: d.oldest_due_date,
    }))
    .sort((a, b) => new Date(a.oldest_due_date).getTime() - new Date(b.oldest_due_date).getTime());
}
