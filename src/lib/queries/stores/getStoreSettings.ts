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

// This function is called directly from 13+ places (two separate hooks plus
// several pages), often several at once on the same screen, with none of
// them aware of each other — a short-lived shared cache means simultaneous
// callers for the same store share one request instead of each firing its
// own. Mirrors the cache pattern in useCurrentUser.ts; kept short since
// settings can be edited via the admin settings page at any time.
const CACHE_DURATION = 30 * 1000; // 30 seconds
const cache = new Map<
  string,
  { promise: Promise<StoreSettings | null>; timestamp: number }
>();

export async function getStoreSettings(
  store_id: string
): Promise<StoreSettings | null> {
  const cached = cache.get(store_id);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.promise;
  }

  const promise = (async () => {
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
    return data as StoreSettings;
  })().catch((err) => {
    cache.delete(store_id);
    throw err;
  });

  cache.set(store_id, { promise, timestamp: Date.now() });
  return promise;
}

/** Call after editing store settings so the next read isn't served stale data from the cache above. */
export function invalidateStoreSettingsCache(store_id: string) {
  cache.delete(store_id);
}
