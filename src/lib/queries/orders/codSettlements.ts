/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types/enums";
import { computeOrderBalances } from "@/lib/queries/customers/customerDueMath";
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
): Promise<UnsettledCodOrder[]> {
  if (!storeId) return [];

  let query = supabase
    .from("orders")
    .select("id, order_number, order_date, courier, customer_id, total_amount, shipping_address")
    .eq("store_id", storeId)
    .eq("payment_method", PaymentMethod.COD)
    .eq("status", OrderStatus.DELIVERED)
    .neq("channel", "pos")
    .is("cod_settlement_id", null)
    .order("order_date", { ascending: true });

  if (courier) query = query.eq("courier", courier);

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
        .select("id, customer_id, total_amount, created_at")
        .eq("store_id", storeId)
        .in("customer_id", customerIds)
        .neq("payment_status", PaymentStatus.PAID)
        .neq("payment_status", PaymentStatus.REFUNDED)
        .order("created_at", { ascending: true }),
      supabase
        .from("customer_payments")
        .select("order_id, amount, customer_id")
        .eq("store_id", storeId)
        .in("customer_id", customerIds),
    ]);

    const ordersByCustomer = new Map<string, { id: string; total_amount: number }[]>();
    for (const o of (customerOrdersRes.data ?? []) as any[]) {
      const list = ordersByCustomer.get(o.customer_id) ?? [];
      list.push({ id: o.id, total_amount: Number(o.total_amount) });
      ordersByCustomer.set(o.customer_id, list);
    }
    const paymentsByCustomer = new Map<string, { order_id: string | null; amount: number }[]>();
    for (const p of (paymentsRes.data ?? []) as any[]) {
      const list = paymentsByCustomer.get(p.customer_id) ?? [];
      list.push({ order_id: p.order_id, amount: Number(p.amount) });
      paymentsByCustomer.set(p.customer_id, list);
    }

    for (const customerId of customerIds) {
      const balances = computeOrderBalances(
        ordersByCustomer.get(customerId) ?? [],
        paymentsByCustomer.get(customerId) ?? [],
      );
      for (const b of balances) dueRemainingByOrderId.set(b.order_id, b.due_remaining);
    }
  }

  // Orders already fully paid off (directly, ahead of or instead of a
  // courier collection) have nothing left for a courier to hand over, so
  // they're dropped rather than shown at a misleading full total_amount.
  return candidates
    .map((order) => {
      const total = Number(order.total_amount) || 0;
      const dueRemaining = order.customer_id ? (dueRemainingByOrderId.get(order.id) ?? 0) : total;
      return {
        id: order.id,
        order_number: order.order_number,
        order_date: order.order_date,
        courier: order.courier,
        customer_name: order.shipping_address?.customer_name || "Unknown Customer",
        total_amount: total,
        due_remaining: Math.max(0, dueRemaining),
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
): Promise<CodSettlementListResult> {
  if (!storeId) return { data: [], total: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("store_cod_settlements")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .order("settlement_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to load COD settlements:", error.message);
    return { data: [], total: 0 };
  }

  return { data: (data as CodSettlement[]) ?? [], total: count ?? 0 };
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
): Promise<number> {
  if (!storeId) return 0;

  const { data, error } = await supabase
    .from("store_cod_settlements")
    .select("total_amount")
    .eq("store_id", storeId)
    .eq("settlement_date", dateStr);

  if (error) {
    console.error("Failed to load COD cash settled for date:", error.message);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
}
