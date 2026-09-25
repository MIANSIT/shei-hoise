import { supabase } from "@/lib/supabase";
import { calculateVendorCurrentDue } from "./calculateVendorDue";

export interface VendorPaymentStats {
  /** Cash collected from vendors within the selected period (vendor_payments.payment_date). */
  received: number;
  prev_received: number;
  /** All-time outstanding — a balance, not a period flow, so it isn't bounded by the period filter (same convention as Customer Dues). */
  total_due: number;
  /** True once the store has actually dispatched stock to a vendor — gates the whole vendor block off the dashboard for stores that never use vendor distribution at all. */
  has_activity: boolean;
}

const EMPTY: VendorPaymentStats = { received: 0, prev_received: 0, total_due: 0, has_activity: false };

/**
 * Vendor-side cash-in for the main Dashboard's "Vendor Payments" block —
 * vendor_profit (the store's margin, already folded into Net Profit) is the
 * profit share of this same cash; this is the full amount collected, distinct from
 * the customer-order payment_status buckets Payment Flow already shows.
 */
export async function getVendorPaymentStatsForPeriod(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
): Promise<VendorPaymentStats> {
  if (!storeId) return EMPTY;

  const [activityRes, stockRes, settlementsRes, paymentsRes, deliveryCostRes] = await Promise.all([
    supabase
      .from("vendor_order_items")
      .select("id, order:vendor_orders!inner(store_id, status)", { count: "exact", head: true })
      .eq("order.store_id", storeId)
      .eq("order.status", "confirmed"),
    supabase
      .from("vendor_stock")
      .select("quantity_available, last_vendor_tp")
      .eq("store_id", storeId),
    supabase.from("vendor_settlements").select("total_receivable").eq("store_id", storeId),
    supabase.from("vendor_payments").select("amount, payment_date").eq("store_id", storeId),
    supabase
      .from("vendor_orders")
      .select("delivery_cost")
      .eq("store_id", storeId)
      .eq("status", "confirmed"),
  ]);

  const hasActivity = (activityRes.count ?? 0) > 0;
  if (!hasActivity) return EMPTY;

  const totalStockValue = (stockRes.data ?? []).reduce(
    (sum, r) => sum + r.quantity_available * Number(r.last_vendor_tp ?? 0),
    0,
  );
  const totalReceivable = (settlementsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total_receivable),
    0,
  );
  const totalDeliveryCostInvoiced = (deliveryCostRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.delivery_cost ?? 0),
    0,
  );
  const payments = paymentsRes.data ?? [];
  const totalPaid = payments.reduce((sum, r) => sum + Number(r.amount), 0);

  const sumInRange = (from: string, to: string) =>
    payments
      .filter((p) => p.payment_date >= from && p.payment_date <= to)
      .reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    received: sumInRange(periodStart, periodEnd),
    prev_received: sumInRange(prevPeriodStart, prevPeriodEnd),
    total_due: calculateVendorCurrentDue({
      unsettledStockValue: totalStockValue,
      totalReceivable,
      totalDeliveryCostInvoiced,
      totalPaid,
    }),
    has_activity: true,
  };
}
