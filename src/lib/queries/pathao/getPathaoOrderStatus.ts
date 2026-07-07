"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import { getOrderInfo } from "@/lib/utils/pathaoApi";

export interface RefreshPathaoStatusResult {
  success: boolean;
  error?: string;
  orderStatus?: string;
}

/** Re-checks a shipment's status with Pathao and updates the order. */
export async function refreshPathaoOrderStatus(
  credentialId: string,
  orderId: string,
  consignmentId: string,
): Promise<RefreshPathaoStatusResult> {
  const tokenResult = await getValidPathaoAccessToken(credentialId);
  if (!tokenResult.ok) {
    return { success: false, error: tokenResult.error };
  }

  const result = await getOrderInfo(tokenResult.environment, tokenResult.accessToken, consignmentId);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const orderStatus = result.data.data.order_status_slug;

  await supabaseAdmin
    .from("orders")
    .update({ pathao_order_status: orderStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  return { success: true, orderStatus };
}
