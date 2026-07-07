// lib/queries/stores/getStoreSettings.ts
import { supabase } from "@/lib/supabase";
import { StoreSettings } from "@/lib/types/store/store";

// Excludes facebook_capi_access_token / facebook_test_event_code deliberately —
// this function is called from public storefront pages (checkout, product,
// terms, privacy policy) that any anonymous visitor can load. Those columns
// must never be sent to a general-purpose caller like this one. Admin-only
// settings UI that needs to know whether a token is configured should use
// getStoreCapiStatus() instead, which never returns the real value either.
const PUBLIC_SAFE_COLUMNS =
  "id, store_id, currency, tax_rate, free_shipping_threshold, min_order_amount, processing_time_days, return_policy_days, terms_and_conditions, privacy_policy, shipping_fees, delivery_couriers, facebook_pixel_id, created_at, updated_at";

export async function getStoreSettings(
  store_id: string
): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select(PUBLIC_SAFE_COLUMNS)
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
