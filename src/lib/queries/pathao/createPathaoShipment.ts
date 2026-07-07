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

/** Turns one Shei Hoise order into one Pathao shipment via a specific connected account. */
export async function createPathaoShipment(
  credentialId: string,
  orderId: string,
  merchantOrderNumber: string,
  input: CreatePathaoShipmentInput,
): Promise<CreatePathaoShipmentResult> {
  const { data: credentials } = await supabaseAdmin
    .from("store_pathao_credentials")
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

  const { consignment_id, order_status } = result.data.data;

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      pathao_consignment_id: consignment_id,
      pathao_order_status: order_status,
      pathao_credential_id: credentialId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Error saving Pathao shipment on order:", updateError);
    // The shipment itself was created successfully on Pathao's side — don't
    // report failure to the caller, just log it for follow-up.
  }

  return { success: true, consignmentId: consignment_id, orderStatus: order_status };
}
