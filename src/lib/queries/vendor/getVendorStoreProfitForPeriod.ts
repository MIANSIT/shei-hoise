import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

export interface VendorStoreProfitResult {
  vendor_profit: number;
  prev_vendor_profit: number;
}

/**
 * Vendor profit for the current and previous period, counted as vendors pay.
 *
 * For each vendor:
 *   profit share = (vendor_tp − original_tp) × qty  ÷  (vendor_tp × qty + delivery cost)
 *   profit       = payments in the period × profit share
 *
 * So a vendor paying little by little shows profit little by little, and an
 * unpaid bill shows none. Paged because a single request is capped at
 * PGRST_DB_MAX_ROWS (1000).
 */
export async function getVendorStoreProfitForPeriod(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
): Promise<VendorStoreProfitResult> {
  const paymentsBetween = (start: string, end: string) =>
    fetchAllPaged((from, to) =>
      supabase
        .from("vendor_payments")
        .select("vendor_id, amount")
        .eq("store_id", storeId)
        .gte("payment_date", start)
        .lte("payment_date", end)
        .order("id")
        .range(from, to),
    );

  try {
    const [orders, payments, prevPayments] = await Promise.all([
      fetchAllPaged((from, to) =>
        supabase
          .from("vendor_orders")
          .select(
            "vendor_id, delivery_cost, items:vendor_order_items(quantity, vendor_tp, original_tp)",
          )
          .eq("store_id", storeId)
          .eq("status", "confirmed")
          .order("id")
          .range(from, to),
      ),
      paymentsBetween(periodStart, periodEnd),
      paymentsBetween(prevPeriodStart, prevPeriodEnd),
    ]);

    // Total bill and total margin per vendor
    const totals = new Map<string, { bill: number; margin: number }>();
    for (const order of orders) {
      const t = totals.get(order.vendor_id) ?? { bill: 0, margin: 0 };
      t.bill += Number(order.delivery_cost ?? 0);
      for (const item of order.items) {
        t.bill += item.quantity * Number(item.vendor_tp);
        t.margin +=
          item.quantity * (Number(item.vendor_tp) - Number(item.original_tp));
      }
      totals.set(order.vendor_id, t);
    }

    const profitFrom = (list: { vendor_id: string; amount: number }[]) =>
      list.reduce((sum, p) => {
        const t = totals.get(p.vendor_id);
        const share = t && t.bill > 0 ? t.margin / t.bill : 0;
        return sum + Number(p.amount) * share;
      }, 0);

    return {
      vendor_profit: profitFrom(payments),
      prev_vendor_profit: profitFrom(prevPayments),
    };
  } catch (error) {
    console.error("Failed to load vendor profit:", error);
    return { vendor_profit: 0, prev_vendor_profit: 0 };
  }
}
