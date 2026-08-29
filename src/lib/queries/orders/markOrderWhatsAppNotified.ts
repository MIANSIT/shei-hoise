"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export interface MarkOrderWhatsAppNotifiedResult {
  success: boolean;
  notifiedAt?: string;
  error?: string;
}

/**
 * Stamps the order with when a "Notify via WhatsApp" click last happened.
 * This only records that the owner opened WhatsApp with the message
 * pre-filled — it can't confirm the message was actually sent or delivered,
 * since that step happens outside the app in WhatsApp itself.
 */
export async function markOrderWhatsAppNotified(
  orderId: string,
): Promise<MarkOrderWhatsAppNotifiedResult> {
  try {
    const storeResult = await getAuthenticatedStoreId();
    if (!storeResult.ok) {
      return { success: false, error: storeResult.error };
    }

    const notifiedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ whatsapp_notified_at: notifiedAt })
      .eq("id", orderId)
      .eq("store_id", storeResult.storeId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notifiedAt };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark order as notified",
    };
  }
}
