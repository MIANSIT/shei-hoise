/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types/enums";
import { computeBranchOrderBalances } from "@/lib/queries/customers/customerDueMath";
import type { CodSettlement, UnsettledCodOrder } from "@/lib/types/codSettlement";

/**
 * Delivered COD orders whose cash hasn't been included in a settlement batch
 * yet — the candidate pool for the next payout a courier hands over. Only
 * DELIVERED orders qualify: that's the point a courier is actually holding
 * collected cash rather than still-in-transit goods. Quick Sale (channel
 * "pos") never needs this — its cash lands in the drawer immediately, same
 * day, no courier in between.
 */
export async function getUnsettledCodOrders(
  storeId: string,
  courier?: string | null,
  /** Stores with branches: a settlement only covers one branch's orders. */
  branchId?: string | null,
): Promise<UnsettledCodOrder[]> {
  if (!storeId) return [];

  let query = supabase
    .from("orders")
    .select("id, order_number, order_date, courier, customer_id, total_amount, shipping_fee, shipping_address, branch_id")
    .eq("store_id", storeId)
    .eq("payment_method", PaymentMethod.COD)
    .eq("status", OrderStatus.DELIVERED)
    .neq("channel", "pos")
    .is("cod_settlement_id", null)
    .order("order_date", { ascending: true });

  if (courier) query = query.eq("courier", courier);
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load unsettled COD orders:", error.message);
    return [];
  }

  const candidates = (data ?? []) as any[];
  if (candidates.length === 0) return [];

  // A candidate's own total_amount overstates what the courier actually
  // owes if the customer already paid part of it directly (e.g. a Customer
  // Dues collection recorded before/after delivery) — net that out via the
  // same per-customer waterfall every other due balance in the app uses
  // (customerDueMath.ts), not just this order in isolation, since an
  // unpinned payment can apply to any of a customer's due orders, not
  // necessarily this one.
  const customerIds = [...new Set(candidates.map((o) => o.customer_id).filter(Boolean))];

  const dueRemainingByOrderId = new Map<string, number>();
  if (customerIds.length > 0) {
    const [customerOrdersRes, paymentsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, customer_id, total_amount, created_at, branch_id")
        .eq("store_id", storeId)
        .in("customer_id", customerIds)
        .neq("payment_status", PaymentStatus.PAID)
        .neq("payment_status", PaymentStatus.REFUNDED)
        .order("created_at", { ascending: true }),
      supabase
        .from("customer_payments")
        .select("*")
        .eq("store_id", storeId)
        .in("customer_id", customerIds),
    ]);

    const ordersByCustomer = new Map<string, { id: string; total_amount: number; branch_id: string | null }[]>();
    for (const o of (customerOrdersRes.data ?? []) as any[]) {
      const list = ordersByCustomer.get(o.customer_id) ?? [];
      list.push({ id: o.id, total_amount: Number(o.total_amount), branch_id: o.branch_id ?? null });
      ordersByCustomer.set(o.customer_id, list);
    }
    const paymentsByCustomer = new Map<string, { order_id: string | null; amount: number; branch_id: string | null }[]>();
    for (const p of (paymentsRes.data ?? []) as any[]) {
      const list = paymentsByCustomer.get(p.customer_id) ?? [];
      list.push({ order_id: p.order_id, amount: Number(p.amount), branch_id: p.branch_id ?? null });
      paymentsByCustomer.set(p.customer_id, list);
    }

    for (const customerId of customerIds) {
      const balances = computeBranchOrderBalances(
        ordersByCustomer.get(customerId) ?? [],
        paymentsByCustomer.get(customerId) ?? [],
      );
      for (const b of balances) dueRemainingByOrderId.set(b.order_id, b.due_remaining);
    }
  }

  // The customer pays the courier the full amount owed (delivery charge
  // included), and the courier keeps its own charge before handing the rest
  // over — so what the store is actually owed is due_remaining minus that
  // charge, not the full total. Uses the latest recorded actual delivery
  // cost; falls back to the shipping fee charged when none is recorded yet
  // (the usual case: the courier's rate is what the customer was quoted).
  // A missing/erroring order_delivery_costs table just means "no recorded
  // costs" here, never a failure of the whole list.
  const actualCostByOrderId = new Map<string, number>();
  const { data: costRows } = await supabase
    .from("order_delivery_costs")
    .select("order_id, amount, created_at")
    .in("order_id", candidates.map((o) => o.id))
    .order("created_at", { ascending: false });
  for (const row of (costRows ?? []) as any[]) {
    if (!actualCostByOrderId.has(row.order_id)) {
      actualCostByOrderId.set(row.order_id, Number(row.amount) || 0);
    }
  }

  // Orders already fully paid off (directly, ahead of or instead of a
  // courier collection) have nothing left for a courier to hand over, so
  // they're dropped rather than shown at a misleading full total_amount.
  return candidates
    .map((order) => {
      const total = Number(order.total_amount) || 0;
      const dueRemaining = Math.max(
        0,
        order.customer_id ? (dueRemainingByOrderId.get(order.id) ?? 0) : total,
      );
      const courierDeduction = actualCostByOrderId.get(order.id) ?? (Number(order.shipping_fee) || 0);
      return {
        id: order.id,
        order_number: order.order_number,
        order_date: order.order_date,
        courier: order.courier,
        customer_name: order.shipping_address?.customer_name || "Unknown Customer",
        branch_id: order.branch_id ?? null,
        total_amount: total,
        due_remaining: dueRemaining,
        courier_deduction: courierDeduction,
        expected_from_courier: Math.max(0, dueRemaining - courierDeduction),
      };
    })
    .filter((o) => o.due_remaining > 0.01);
}

export interface CodSettlementListResult {
  data: CodSettlement[];
  total: number;
}

/** Settlement history for the COD Settlements page — newest first. */
export async function getCodSettlementsList(
  storeId: string,
  page = 1,
  pageSize = 10,
  branchId?: string | null,
): Promise<CodSettlementListResult> {
  if (!storeId) return { data: [], total: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("store_cod_settlements")
    .select("*", { count: "exact" })
    .eq("store_id", storeId);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error, count } = await query
    .order("settlement_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to load COD settlements:", error.message);
    return { data: [], total: 0 };
  }

  return { data: (data as CodSettlement[]) ?? [], total: count ?? 0 };
}

/**
 * Cash from COD orders marked Paid directly (no courier settlement), on the
 * day they were marked paid (orders.paid_at). Settled orders are excluded —
 * their cash is counted once, via the settlement.
 */
export async function getCodMarkedPaidCashForDate(
  storeId: string,
  dateStr: string, // YYYY-MM-DD, Asia/Dhaka
  branchId?: string | null,
): Promise<number> {
  if (!storeId) return 0;

  // Dhaka day as an instant range (the register's dates are Asia/Dhaka).
  let query = supabase
    .from("orders")
    .select("id, total_amount, customer_id")
    .eq("store_id", storeId)
    .eq("payment_method", PaymentMethod.COD)
    .eq("payment_status", PaymentStatus.PAID)
    .is("cod_settlement_id", null)
    .neq("status", OrderStatus.CANCELLED)
    .neq("status", OrderStatus.RETURNED)
    .gte("paid_at", `${dateStr}T00:00:00+06:00`)
    .lte("paid_at", `${dateStr}T23:59:59.999+06:00`);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data: orders, error } = await query;

  // Also fails harmlessly before the paid_at migration has been applied.
  if (error) {
    console.error("Failed to load COD orders marked paid:", error.message);
    return 0;
  }
  if (!orders || orders.length === 0) return 0;

  // Whatever the customer already paid towards these orders is counted on its
  // own date — only the remainder is new cash. That includes payments not
  // pinned to an invoice, so use the same per-customer waterfall as every
  // other due balance (customerDueMath.ts) rather than pinned payments alone.
  const customerIds = [...new Set(orders.map((o) => o.customer_id).filter((id): id is string => !!id))];
  const allocatedByOrderId = new Map<string, number>();

  if (customerIds.length > 0) {
    const [customerOrdersRes, paymentsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, customer_id, total_amount, branch_id")
        .eq("store_id", storeId)
        .in("customer_id", customerIds)
        .neq("status", OrderStatus.CANCELLED)
        .neq("status", OrderStatus.RETURNED)
        .order("created_at", { ascending: true }),
      supabase.from("customer_payments").select("*").eq("store_id", storeId).in("customer_id", customerIds),
    ]);

    type Row = { id: string; customer_id: string; total_amount: number; branch_id: string | null };
    type Pay = { customer_id: string; order_id: string | null; amount: number; branch_id: string | null };
    const ordersByCustomer = new Map<string, Row[]>();
    for (const o of (customerOrdersRes.data ?? []) as Row[]) {
      ordersByCustomer.set(o.customer_id, [...(ordersByCustomer.get(o.customer_id) ?? []), o]);
    }
    const paymentsByCustomer = new Map<string, Pay[]>();
    for (const p of (paymentsRes.data ?? []) as Pay[]) {
      paymentsByCustomer.set(p.customer_id, [...(paymentsByCustomer.get(p.customer_id) ?? []), p]);
    }
    for (const customerId of customerIds) {
      const balances = computeBranchOrderBalances(
        (ordersByCustomer.get(customerId) ?? []).map((o) => ({
          id: o.id,
          total_amount: Number(o.total_amount),
          branch_id: o.branch_id ?? null,
        })),
        (paymentsByCustomer.get(customerId) ?? []).map((p) => ({
          order_id: p.order_id,
          amount: Number(p.amount),
          branch_id: p.branch_id ?? null,
        })),
      );
      for (const b of balances) allocatedByOrderId.set(b.order_id, b.paid_allocated);
    }
  }

  // Orders with no customer can only have pinned payments.
  const guestOrderIds = orders.filter((o) => !o.customer_id).map((o) => o.id);
  if (guestOrderIds.length > 0) {
    const { data: guestPayments } = await supabase
      .from("customer_payments")
      .select("order_id, amount")
      .eq("store_id", storeId)
      .in("order_id", guestOrderIds);
    for (const p of guestPayments ?? []) {
      if (p.order_id) {
        allocatedByOrderId.set(p.order_id, (allocatedByOrderId.get(p.order_id) ?? 0) + (Number(p.amount) || 0));
      }
    }
  }

  return orders.reduce(
    (sum, o) => sum + Math.max(0, (Number(o.total_amount) || 0) - (allocatedByOrderId.get(o.id) ?? 0)),
    0,
  );
}

/**
 * Every settlement's total_amount landed on its own settlement_date — this
 * is what getQuickSaleDailySummary folds into "expected cash" for a given
 * day, since that's the day the money actually arrived, not the day any of
 * the orders it covers were originally sold.
 */
export async function getCodCashSettledForDate(
  storeId: string,
  dateStr: string,
  /** Stores with branches: cash handed over to this branch's drawer. */
  branchId?: string | null,
): Promise<number> {
  if (!storeId) return 0;

  let query = supabase
    .from("store_cod_settlements")
    .select("total_amount")
    .eq("store_id", storeId)
    .eq("settlement_date", dateStr);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;

  if (error) {
    console.error("Failed to load COD cash settled for date:", error.message);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
}
