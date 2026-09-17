import { supabase } from "@/lib/supabase";
import { OrderStatus, PaymentMethod } from "@/lib/types/enums";
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
    .select("id, order_number, order_date, courier, total_amount, shipping_address")
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((order: any) => ({
    id: order.id,
    order_number: order.order_number,
    order_date: order.order_date,
    courier: order.courier,
    customer_name: order.shipping_address?.customer_name || "Unknown Customer",
    total_amount: Number(order.total_amount) || 0,
  }));
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
