"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getSteadfastCredentials } from "@/lib/utils/getSteadfastCredentials";
import { normalizeBdPhone } from "@/lib/utils/normalizeBdPhone";
import { createOrder } from "@/lib/utils/steadfastApi";

export interface CreateSteadfastShipmentInput {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number; // 0 if already paid online
  note?: string;
  itemDescription?: string;
}

export interface CreateSteadfastShipmentResult {
  success: boolean;
  error?: string;
  consignmentId?: string;
  orderStatus?: string;
}

/** Everything about a shipment that Shei Hoise already knows itself — Steadfast's own ledger (settlement, etc.) is never exposed by their API. */
export interface SteadfastShipmentDetails {
  courier: "steadfast";
  codAmount: number;
  note: string | null;
  description: string | null;
}

/** Turns one Shei Hoise order into one Steadfast shipment via a specific connected account. */
export async function createSteadfastShipment(
  credentialId: string,
  orderId: string,
  merchantOrderNumber: string,
  input: CreateSteadfastShipmentInput,
): Promise<CreateSteadfastShipmentResult> {
  const storeResult = await getAuthenticatedStoreId();
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

  const credsResult = await getSteadfastCredentials(credentialId, storeId);
  if (!credsResult.ok) {
    return { success: false, error: credsResult.error };
  }

  // Claim this order for a new shipment before calling Steadfast's live API.
  // "courier_tracking_one_active_per_order" (a partial unique index on
  // order_id where is_active) means a second, near-simultaneous request for
  // the same order loses this insert with a unique violation — so it never
  // reaches Steadfast at all. Checking "does an active row exist?" first and
  // inserting afterward (the previous approach) leaves a race window where
  // two concurrent requests can both pass the check and both dispatch a
  // real shipment.
  const { data: claim, error: claimError } = await supabaseAdmin
    .from("courier_tracking")
    .insert({
      order_id: orderId,
      store_id: storeId,
      courier: "steadfast",
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
    console.error("Error reserving Steadfast shipment slot:", claimError);
    return { success: false, error: "Failed to reserve this shipment" };
  }

  const result = await createOrder(credsResult.apiKey, credsResult.secretKey, {
    invoice: merchantOrderNumber,
    recipient_name: input.recipientName,
    recipient_phone: recipientPhone,
    recipient_address: input.recipientAddress,
    cod_amount: input.codAmount,
    note: input.note,
    item_description: input.itemDescription,
  });

  if (!result.ok) {
    // No real shipment was created — release the claim so a retry isn't
    // blocked by a placeholder row that doesn't correspond to anything real.
    await supabaseAdmin.from("courier_tracking").delete().eq("id", claim.id);
    return { success: false, error: result.error };
  }

  const { tracking_code, status } = result.data.consignment;

  const shipmentDetails: SteadfastShipmentDetails = {
    courier: "steadfast",
    codAmount: input.codAmount,
    note: input.note ?? null,
    description: input.itemDescription ?? null,
  };

  const { error: trackingError } = await supabaseAdmin
    .from("courier_tracking")
    .update({
      consignment_id: tracking_code,
      status,
      shipment_details: shipmentDetails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claim.id);

  if (trackingError) {
    console.error("Error saving Steadfast shipment tracking:", trackingError);
    // The shipment itself was created successfully on Steadfast's side —
    // don't report failure to the caller, just log it for follow-up.
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ courier: "steadfast", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (updateError) {
    console.error("Error saving Steadfast courier selection on order:", updateError);
  }

  return { success: true, consignmentId: tracking_code, orderStatus: status };
}
