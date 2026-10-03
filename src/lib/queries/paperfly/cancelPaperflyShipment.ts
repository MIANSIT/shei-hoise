"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaperflyCredentials } from "@/lib/utils/getPaperflyCredentials";
import { cancelOrder } from "@/lib/utils/paperflyApi";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import type { PaperflyShipmentDetails } from "./createPaperflyShipment";

export interface CancelPaperflyShipmentResult {
  success: boolean;
  error?: string;
  orderStatus?: string;
}

/**
 * Cancels a Paperfly shipment on Paperfly's side, then marks it "Cancelled"
 * here. The row stays active (same as a courier-reported cancellation), so
 * the order shows the cancelled shipment and the Delivery Courier picker
 * unlocks via isCourierLocked — staff can then switch courier (which retires
 * this row) before shipping again.
 */
export async function cancelPaperflyShipment(
  credentialId: string,
  orderId: string,
  trackingNumber: string,
): Promise<CancelPaperflyShipmentResult> {
  const storeResult = await getAuthorizedStoreId("courier.add");
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
    .select("id, shipment_details, orders!order_id ( order_number )")
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

  const result = await cancelOrder(credsResult.auth, reference);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const orderStatus = "Cancelled";
  const { error: updateError } = await supabaseAdmin
    .from("courier_tracking")
    .update({ status: orderStatus, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updateError) {
    // Already cancelled on Paperfly's side — log, don't report failure.
    console.error("Error saving Paperfly cancellation:", updateError);
  }

  return { success: true, orderStatus };
}
