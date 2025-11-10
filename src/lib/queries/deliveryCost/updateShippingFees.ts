// queries/shipping/updateShippingFees.ts
import { supabase } from "@/lib/supabase";
import { ShippingOption } from "./getShippingFees";

export async function updateShippingFees(
  storeId: string,
  updates: {
    shipping_options?: ShippingOption[];
    free_shipping_threshold?: number;
    processing_time_days?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("store_settings")
      .update({
        shipping_fees: updates.shipping_options,
        free_shipping_threshold: updates.free_shipping_threshold,
        processing_time_days: updates.processing_time_days,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", storeId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error updating shipping fees:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
