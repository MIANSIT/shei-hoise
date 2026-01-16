// queries/shipping/getShippingFees.ts
import { supabase } from "@/lib/supabase";

export interface ShippingOption {
  name: string;
  price: number;
  estimated_days?: number; // new optional field
}

export interface StoreShippingConfig {
  store_id: string;
  currency: string;
  free_shipping_threshold?: number;
  processing_time_days?: number;
  shipping_options: ShippingOption[];
}

export async function getShippingFees(
  storeSlug: string
): Promise<StoreShippingConfig | null> {
  try {
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select(
        `
        id,
        store_settings (
          currency,
          free_shipping_threshold,
          processing_time_days,
          shipping_fees
        )
      `
      )
      .eq("store_slug", storeSlug)
      .eq("is_active", true)
      .single();

    if (storeError) throw storeError;
    if (!storeData) return null;

    const storeSettings = storeData.store_settings?.[0];

    const shippingOptions: ShippingOption[] =
      storeSettings?.shipping_fees || [];

    return {
      store_id: storeData.id,
      currency: storeSettings?.currency || "BDT",
      free_shipping_threshold: storeSettings?.free_shipping_threshold,
      processing_time_days: storeSettings?.processing_time_days,
      shipping_options: shippingOptions,
    };
  } catch (error) {
    console.error("Error in getShippingFees:", error);
    return null;
  }
}
