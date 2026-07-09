"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getSteadfastCredentials } from "@/lib/utils/getSteadfastCredentials";
import { getStatusByTrackingCode } from "@/lib/utils/steadfastApi";

export interface RefreshSteadfastStatusResult {
  success: boolean;
  error?: string;
  orderStatus?: string;
}

/** Re-checks a shipment's status with Steadfast and updates the order. */
export async function refreshSteadfastOrderStatus(
  credentialId: string,
  orderId: string,
  trackingCode: string,
): Promise<RefreshSteadfastStatusResult> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }

  const credsResult = await getSteadfastCredentials(credentialId, storeResult.storeId);
  if (!credsResult.ok) {
    return { success: false, error: credsResult.error };
  }

  const result = await getStatusByTrackingCode(credsResult.apiKey, credsResult.secretKey, trackingCode);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const orderStatus = result.data.delivery_status;

  await supabaseAdmin
    .from("courier_tracking")
    .update({ status: orderStatus, updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("store_id", storeResult.storeId)
    .eq("is_active", true);

  return { success: true, orderStatus };
}
