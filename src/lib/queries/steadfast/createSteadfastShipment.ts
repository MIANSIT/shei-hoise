"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSteadfastCredentials } from "@/lib/utils/getSteadfastCredentials";
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
  storeId: string,
  merchantOrderNumber: string,
  input: CreateSteadfastShipmentInput,
): Promise<CreateSteadfastShipmentResult> {
  const credsResult = await getSteadfastCredentials(credentialId);
  if (!credsResult.ok) {
    return { success: false, error: credsResult.error };
  }

  const result = await createOrder(credsResult.apiKey, credsResult.secretKey, {
    invoice: merchantOrderNumber,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    recipient_address: input.recipientAddress,
    cod_amount: input.codAmount,
    note: input.note,
    item_description: input.itemDescription,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const { tracking_code, status } = result.data.consignment;

  const shipmentDetails: SteadfastShipmentDetails = {
    courier: "steadfast",
    codAmount: input.codAmount,
    note: input.note ?? null,
    description: input.itemDescription ?? null,
  };

  const { error: trackingError } = await supabaseAdmin.from("courier_tracking").insert({
    order_id: orderId,
    store_id: storeId,
    courier: "steadfast",
    courier_credential_id: credentialId,
    consignment_id: tracking_code,
    status: status,
    shipment_details: shipmentDetails,
    is_active: true,
  });

  if (trackingError) {
    console.error("Error saving Steadfast shipment tracking:", trackingError);
    // The shipment itself was created successfully on Steadfast's side —
    // don't report failure to the caller, just log it for follow-up.
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ courier: "steadfast", updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    console.error("Error saving Steadfast courier selection on order:", updateError);
  }

  return { success: true, consignmentId: tracking_code, orderStatus: status };
}
