"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import { createOrder } from "@/lib/utils/pathaoApi";

export interface CreatePathaoShipmentInput {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  itemWeight: number; // kg, 0.5–10
  itemQuantity: number;
  itemDescription?: string;
  specialInstruction?: string;
  amountToCollect: number; // 0 if already paid online
}

export interface CreatePathaoShipmentResult {
  success: boolean;
  error?: string;
  consignmentId?: string;
  orderStatus?: string;
}

/** Everything about a shipment that Shei Hoise already knows itself — no Pathao ledger data (COD fee, discounts, etc.), since that's never exposed by their Merchant API. */
export interface PathaoShipmentDetails {
  courier: "pathao";
  deliveryFee: number;
  productType: string;
  deliveryType: string;
  weight: number;
  quantity: number;
  description: string | null;
  specialInstruction: string | null;
  amountToCollect: number;
}

/** Turns one Shei Hoise order into one Pathao shipment via a specific connected account. */
export async function createPathaoShipment(
  credentialId: string,
  orderId: string,
  storeId: string,
  merchantOrderNumber: string,
  input: CreatePathaoShipmentInput,
): Promise<CreatePathaoShipmentResult> {
  const { data: credentials } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("pathao_store_id")
    .eq("id", credentialId)
    .maybeSingle();

  if (!credentials?.pathao_store_id) {
    return { success: false, error: "This Pathao account is not fully connected" };
  }

  const tokenResult = await getValidPathaoAccessToken(credentialId);
  if (!tokenResult.ok) {
    return { success: false, error: tokenResult.error };
  }

  const result = await createOrder(tokenResult.environment, tokenResult.accessToken, {
    store_id: credentials.pathao_store_id,
    merchant_order_id: merchantOrderNumber,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    recipient_address: input.recipientAddress,
    delivery_type: 48,
    item_type: 2,
    special_instruction: input.specialInstruction,
    item_quantity: input.itemQuantity,
    item_weight: String(input.itemWeight),
    item_description: input.itemDescription,
    amount_to_collect: input.amountToCollect,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const { consignment_id, order_status, delivery_fee } = result.data.data;

  const shipmentDetails: PathaoShipmentDetails = {
    courier: "pathao",
    deliveryFee: delivery_fee,
    productType: "Parcel",
    deliveryType: "Normal (48 hours)",
    weight: input.itemWeight,
    quantity: input.itemQuantity,
    description: input.itemDescription ?? null,
    specialInstruction: input.specialInstruction ?? null,
    amountToCollect: input.amountToCollect,
  };

  const { error: trackingError } = await supabaseAdmin.from("courier_tracking").insert({
    order_id: orderId,
    store_id: storeId,
    courier: "pathao",
    courier_credential_id: credentialId,
    consignment_id: consignment_id,
    status: order_status,
    shipment_details: shipmentDetails,
    is_active: true,
  });

  if (trackingError) {
    console.error("Error saving Pathao shipment tracking:", trackingError);
    // The shipment itself was created successfully on Pathao's side — don't
    // report failure to the caller, just log it for follow-up.
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ courier: "pathao", updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    console.error("Error saving Pathao courier selection on order:", updateError);
  }

  return { success: true, consignmentId: consignment_id, orderStatus: order_status };
}
