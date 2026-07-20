import { supabase } from "@/lib/supabase";

export interface VendorStoreProfitResult {
  vendor_profit: number;
  prev_vendor_profit: number;
}

/**
 * Returns realized vendor profit for a store within two time windows
 * (current period and previous period) so the dashboard can show
 * period-over-period comparison.
 *
 * Realized profit per settlement item:
 *   receivable_amount  (sold_qty * unit_price charged to vendor)
 * − sold_qty * weighted_avg_original_tp  (what the stock actually cost us)
 *
 * original_tp is pulled from all confirmed vendor_order_items for the store
 * and averaged per (product_id, variant_id) — this is stable cost-basis data
 * that doesn't change with the period filter.
 */
export async function getVendorStoreProfitForPeriod(
  storeId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
): Promise<VendorStoreProfitResult> {
  const [orderItemsRes, currentRes, prevRes] = await Promise.all([
    // All confirmed dispatch items for this store → build original_tp cost map
    supabase
      .from("vendor_order_items")
      .select(
        "product_id, variant_id, quantity, original_tp, order:vendor_orders!inner(store_id, status)",
      )
      .eq("order.store_id", storeId)
      .eq("order.status", "confirmed"),

    // Settlement items in the current period
    supabase
      .from("vendor_settlement_items")
      .select(
        "product_id, variant_id, sold_quantity, receivable_amount, settlement:vendor_settlements!inner(store_id, settlement_date)",
      )
      .eq("settlement.store_id", storeId)
      .gte("settlement.settlement_date", periodStart)
      .lte("settlement.settlement_date", periodEnd),

    // Settlement items in the previous period
    supabase
      .from("vendor_settlement_items")
      .select(
        "product_id, variant_id, sold_quantity, receivable_amount, settlement:vendor_settlements!inner(store_id, settlement_date)",
      )
      .eq("settlement.store_id", storeId)
      .gte("settlement.settlement_date", prevPeriodStart)
      .lte("settlement.settlement_date", prevPeriodEnd),
  ]);

  // Build weighted-average original_tp per (product_id, variant_id)
  const costMap = new Map<string, { totalCost: number; totalQty: number }>();
  for (const r of orderItemsRes.data ?? []) {
    const key = `${r.product_id}::${r.variant_id ?? ""}`;
    const prev = costMap.get(key) ?? { totalCost: 0, totalQty: 0 };
    costMap.set(key, {
      totalCost: prev.totalCost + Number(r.original_tp) * r.quantity,
      totalQty: prev.totalQty + r.quantity,
    });
  }

  const calcProfit = (items: typeof currentRes.data) =>
    (items ?? []).reduce((sum, r) => {
      if (!r.sold_quantity) return sum;
      const key = `${r.product_id}::${r.variant_id ?? ""}`;
      const entry = costMap.get(key);
      const avgCost = entry && entry.totalQty > 0 ? entry.totalCost / entry.totalQty : 0;
      return sum + Number(r.receivable_amount) - r.sold_quantity * avgCost;
    }, 0);

  return {
    vendor_profit: calcProfit(currentRes.data),
    prev_vendor_profit: calcProfit(prevRes.data),
  };
}
