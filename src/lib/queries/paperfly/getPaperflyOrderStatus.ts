"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaperflyCredentials } from "@/lib/utils/getPaperflyCredentials";
import { derivePaperflyStatus, trackOrder } from "@/lib/utils/paperflyApi";
import { autoMarkOrderDeliveredFromCourier } from "@/lib/queries/orders/autoMarkOrderDelivered";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import type { PaperflyShipmentDetails } from "./createPaperflyShipment";

export interface RefreshPaperflyStatusResult {
  success: boolean;
  error?: string;
  orderStatus?: string;
}

/**
 * Re-checks a shipment's status with Paperfly and updates the order.
 * Paperfly tracks by the merchantOrderReference sent at creation, so the
 * reference is read back from that shipment's stored details.
 */
export async function refreshPaperflyOrderStatus(
  credentialId: string,
  orderId: string,
  trackingNumber: string,
): Promise<RefreshPaperflyStatusResult> {
  const storeResult = await getAuthorizedStoreId("courier.view");
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }
  const storeId = storeResult.storeId;

  const credsResult = await getPaperflyCredentials(credentialId, storeId);
  if (!credsResult.ok) {
    return { success: false, error: credsResult.error };
  }

  const { data: row } = await supabaseAdmin
    .from("courier_tracking")
    .select("id, is_active, shipment_details, orders!order_id ( order_number )")
    .eq("order_id", orderId)
    .eq("store_id", storeId)
    .eq("courier", "paperfly")
    .eq("consignment_id", trackingNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { success: false, error: "Paperfly shipment not found" };
  }

  const details = row.shipment_details as PaperflyShipmentDetails | null;
  const order = (Array.isArray(row.orders) ? row.orders[0] : row.orders) as
    | { order_number: string }
    | null;
  const reference = details?.reference || order?.order_number;
  if (!reference) {
    return { success: false, error: "Paperfly shipment reference is missing" };
  }

  const result = await trackOrder(credsResult.auth, reference);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const orderStatus = derivePaperflyStatus(result.data.success?.trackingStatus?.[0]);

  await supabaseAdmin
    .from("courier_tracking")
    .update({ status: orderStatus, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (row.is_active) {
    await autoMarkOrderDeliveredFromCourier(orderId, orderStatus);
  }

  return { success: true, orderStatus };
}
