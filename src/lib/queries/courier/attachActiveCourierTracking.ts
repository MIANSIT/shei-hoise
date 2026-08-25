"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export interface ActiveTrackingFields {
  courier_consignment_id: string | null;
  courier_order_status: string | null;
  courier_credential_id: string | null;
}

/**
 * Looks up each order's active (is_active = true) courier_tracking row and
 * returns a lookup map keyed by order id — courier_tracking is service-role
 * only (no anon/authenticated RLS policies, same as store_courier_credentials),
 * so this has to be a server action even though callers like getStoreOrders.ts
 * run client-side. Callers merge the flattened fields into their own order
 * objects locally rather than round-tripping full order payloads through here.
 */
export async function getActiveCourierTrackingByOrderIds(
  orderIds: string[],
): Promise<Record<string, ActiveTrackingFields>> {
  if (orderIds.length === 0) return {};

  // orderIds is caller-supplied — narrow it down to orders that actually
  // belong to the caller's own store before reading their courier tracking.
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
    .from("courier_tracking")
    .select("order_id, consignment_id, status, courier_credential_id")
    .in("order_id", ownedOrderIds)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching active courier tracking:", error);
    return {};
  }

  const result: Record<string, ActiveTrackingFields> = {};
  for (const row of data ?? []) {
    result[row.order_id] = {
      courier_consignment_id: row.consignment_id,
      courier_order_status: row.status,
      courier_credential_id: row.courier_credential_id,
    };
  }
  return result;
}
