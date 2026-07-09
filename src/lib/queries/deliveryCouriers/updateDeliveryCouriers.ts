"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DeliveryCourier } from "@/lib/types/store/store";

/**
 * store_settings has no unique constraint on store_id (only its own `id` PK),
 * so this can't be a plain upsert — update first, and only insert a new row
 * if the store genuinely has no settings row yet (mirrors the update/create
 * split already used for shipping_fees).
 */
export async function updateDeliveryCouriers(
  storeId: string,
  deliveryCouriers: DeliveryCourier[],
): Promise<{ success: boolean; error?: string }> {
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("store_settings")
    .update({
      delivery_couriers: deliveryCouriers,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .select("id");

  if (updateError) {
    console.error("Error updating delivery couriers:", updateError);
    return { success: false, error: "Failed to save" };
  }

  if (updated && updated.length > 0) {
    return { success: true };
  }

  const { error: insertError } = await supabaseAdmin.from("store_settings").insert({
    store_id: storeId,
    delivery_couriers: deliveryCouriers,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Error creating store settings for delivery couriers:", insertError);
    return { success: false, error: "Failed to save" };
  }

  return { success: true };
}
