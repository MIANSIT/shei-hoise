"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaperflyCredentials } from "@/lib/utils/getPaperflyCredentials";
import { normalizeBdPhone } from "@/lib/utils/normalizeBdPhone";
import { createOrder } from "@/lib/utils/paperflyApi";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

export interface CreatePaperflyShipmentInput {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number; // 0 if already paid online
  weight: number; // kg
  itemDescription?: string;
}

export interface CreatePaperflyShipmentResult {
  success: boolean;
  error?: string;
  consignmentId?: string;
  orderStatus?: string;
}

/** Everything about a shipment that Shei Hoise already knows itself. */
export interface PaperflyShipmentDetails {
  courier: "paperfly";
  /** The merchantOrderReference sent to Paperfly — tracking is looked up by this, not the tracking number. */
  reference: string;
  codAmount: number;
  weight: number;
  description: string | null;
  trackingBarcode: string | null;
}

/** Turns one Shei Hoise order into one Paperfly shipment via a specific connected account. */
export async function createPaperflyShipment(
  credentialId: string,
  orderId: string,
  merchantOrderNumber: string,
  input: CreatePaperflyShipmentInput,
): Promise<CreatePaperflyShipmentResult> {
  const storeResult = await getAuthorizedStoreId("courier.add");
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }
  const storeId = storeResult.storeId;

  const recipientPhone = normalizeBdPhone(input.recipientPhone);
  if (!recipientPhone) {
    return {
      success: false,
      error: "Recipient phone must be a valid 11-digit Bangladeshi number (e.g. 01712345678)",
    };
  }

  const credsResult = await getPaperflyCredentials(credentialId, storeId);
  if (!credsResult.ok) {
    return { success: false, error: credsResult.error };
  }

  // Paperfly rejects a merchantOrderReference it has seen before, so a
  // reship after a cancelled Paperfly shipment gets a "-2", "-3"… suffix.
  const { count: previousPaperflyShipments } = await supabaseAdmin
    .from("courier_tracking")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("store_id", storeId)
    .eq("courier", "paperfly");
  const attempt = (previousPaperflyShipments ?? 0) + 1;
  const reference = attempt > 1 ? `${merchantOrderNumber}-${attempt}` : merchantOrderNumber;

  // Claim this order before calling Paperfly's live API — the partial unique
  // index "courier_tracking_one_active_per_order" makes a near-simultaneous
  // second request lose this insert, so it never dispatches a duplicate.
  const { data: claim, error: claimError } = await supabaseAdmin
    .from("courier_tracking")
    .insert({
      order_id: orderId,
      store_id: storeId,
      courier: "paperfly",
      courier_credential_id: credentialId,
      consignment_id: "pending",
      status: "pending",
      is_active: true,
    })
    .select("id")
    .single();

  if (claimError || !claim) {
    if (claimError?.code === "23505") {
      return {
        success: false,
        error: "This order already has an active shipment. Switch the delivery courier before creating a new one.",
      };
    }
    console.error("Error reserving Paperfly shipment slot:", claimError);
    return { success: false, error: "Failed to reserve this shipment" };
  }

  const weight = Math.max(0.1, input.weight || 0.5);

  const result = await createOrder(credsResult.auth, {
    merchantOrderReference: reference,
    storeName: credsResult.storeName,
    productBrief: (input.itemDescription || "Parcel").slice(0, 250),
    packagePrice: String(input.codAmount),
    max_weight: String(weight),
    customerName: input.recipientName,
    customerAddress: input.recipientAddress,
    customerPhone: recipientPhone,
  });

  const trackingNumber = result.ok ? result.data.success?.tracking_number : undefined;

  if (!result.ok || !trackingNumber) {
    // No real shipment was created — release the claim so a retry isn't blocked.
    await supabaseAdmin.from("courier_tracking").delete().eq("id", claim.id);
    return {
      success: false,
      error: result.ok ? "Paperfly did not return a tracking number" : result.error,
    };
  }

  const status = "Pending";
  const shipmentDetails: PaperflyShipmentDetails = {
    courier: "paperfly",
    reference,
    codAmount: input.codAmount,
    weight,
    description: input.itemDescription ?? null,
    trackingBarcode: result.data.success?.tracking_barcode ?? null,
  };

  const { error: trackingError } = await supabaseAdmin
    .from("courier_tracking")
    .update({
      consignment_id: trackingNumber,
      status,
      shipment_details: shipmentDetails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claim.id);

  if (trackingError) {
    // The shipment itself exists on Paperfly's side — log, don't fail.
    console.error("Error saving Paperfly shipment tracking:", trackingError);
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ courier: "paperfly", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (updateError) {
    console.error("Error saving Paperfly courier selection on order:", updateError);
  }

  return { success: true, consignmentId: trackingNumber, orderStatus: status };
}
