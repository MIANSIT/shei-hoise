"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import { normalizeBdPhone } from "@/lib/utils/normalizeBdPhone";
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

/**
 * Everything about a shipment — set at creation from what Shei Hoise already
 * knows itself, with `paymentStatus`/`invoiceId` filled in later by the
 * "order.paid" webhook event once Pathao actually settles the COD payment
 * (never available at creation time, since their Merchant API doesn't
 * expose ledger data up front).
 */
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
  paymentStatus?: string | null;
  invoiceId?: string | null;
}

/** Turns one Shei Hoise order into one Pathao shipment via a specific connected account. */
export async function createPathaoShipment(
  credentialId: string,
  orderId: string,
  merchantOrderNumber: string,
  input: CreatePathaoShipmentInput,
): Promise<CreatePathaoShipmentResult> {
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

  const { data: credentials } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("pathao_store_id")
    .eq("id", credentialId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!credentials?.pathao_store_id) {
    return { success: false, error: "This Pathao account is not fully connected" };
  }

  const tokenResult = await getValidPathaoAccessToken(credentialId, storeId);
  if (!tokenResult.ok) {
    return { success: false, error: tokenResult.error };
  }

  // Claim this order for a new shipment before calling Pathao's live API.
  // "courier_tracking_one_active_per_order" (a partial unique index on
  // order_id where is_active) means a second, near-simultaneous request for
  // the same order loses this insert with a unique violation — so it never
  // reaches Pathao at all. Checking "does an active row exist?" first and
  // inserting afterward (the previous approach) leaves a race window where
  // two concurrent requests can both pass the check and both dispatch a
  // real shipment.
  const { data: claim, error: claimError } = await supabaseAdmin
    .from("courier_tracking")
    .insert({
      order_id: orderId,
      store_id: storeId,
      courier: "pathao",
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
    console.error("Error reserving Pathao shipment slot:", claimError);
    return { success: false, error: "Failed to reserve this shipment" };
  }

  const result = await createOrder(tokenResult.environment, tokenResult.accessToken, {
    store_id: credentials.pathao_store_id,
    merchant_order_id: merchantOrderNumber,
    recipient_name: input.recipientName,
    recipient_phone: recipientPhone,
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
    // No real shipment was created — release the claim so a retry isn't
    // blocked by a placeholder row that doesn't correspond to anything real.
    await supabaseAdmin.from("courier_tracking").delete().eq("id", claim.id);
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

  const { error: trackingError } = await supabaseAdmin
    .from("courier_tracking")
    .update({
      consignment_id,
      status: order_status,
      shipment_details: shipmentDetails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claim.id);

  if (trackingError) {
    console.error("Error saving Pathao shipment tracking:", trackingError);
    // The shipment itself was created successfully on Pathao's side — don't
    // report failure to the caller, just log it for follow-up.
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ courier: "pathao", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (updateError) {
    console.error("Error saving Pathao courier selection on order:", updateError);
  }

  return { success: true, consignmentId: consignment_id, orderStatus: order_status };
}
