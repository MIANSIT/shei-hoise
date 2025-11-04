// lib/queries/stores/getStoreSettings.ts
import { supabase } from "@/lib/supabase";

export interface ShippingFee {
  name: string; // Changed from location
  price: number; // Changed from fee
  description?: string;
  min_order_amount?: number;
  max_order_amount?: number;
  estimated_days?: number;
}

export interface StoreSettings {
  id: string;
  store_id: string;
  currency: string;
  tax_rate: number;
  free_shipping_threshold: number | null;
  min_order_amount: number;
  processing_time_days: number;
  return_policy_days: number;
  terms_and_conditions: string;
  privacy_policy: string;
  shipping_fees: ShippingFee[];
  created_at: string;
  updated_at: string;
}

export async function getStoreSettings(
  store_id: string
): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store_id)
    .single();

  if (error) {
    console.error("Error fetching store settings:", error);
    return null;
  }

  if (!data) {
    console.error("No store settings found for store ID:", store_id);
    return null;
  }

  return data;
}