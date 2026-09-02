"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

/**
 * Sum of customer_payments recorded against each of the given order ids —
 * powers the "Advance" hint in the All Orders table and the Paid/Due lines
 * on the regular order invoice. customer_payments only has a SELECT RLS
 * policy for the authenticated store owner (see
 * 20260902000000_add_customer_payments.sql), which an anon-key read from a
 * batch-loaded table page wouldn't reliably carry, so this runs server-side
 * with supabaseAdmin — mirrors getActiveCourierTrackingByOrderIds.ts exactly.
 */
export async function getCustomerPaymentsSummaryByOrderIds(
  orderIds: string[],
): Promise<Record<string, number>> {
  if (orderIds.length === 0) return {};

  // orderIds is caller-supplied — narrow down to orders that actually belong
  // to the caller's own store before summing their payments.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return {};

  const { data: ownedOrders } = await supabaseAdmin
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("store_id", storeResult.storeId);

  const ownedOrderIds = (ownedOrders ?? []).map((o) => o.id);
  if (ownedOrderIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("customer_payments")
    .select("order_id, amount")
    .in("order_id", ownedOrderIds);

  if (error) {
    console.error("Error fetching customer payments summary:", error);
    return {};
  }

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.order_id) continue;
    result[row.order_id] = (result[row.order_id] ?? 0) + Number(row.amount);
  }
  return result;
}
