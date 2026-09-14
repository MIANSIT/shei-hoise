// lib/queries/stores/getStoreBranding.ts
import { supabase } from "@/lib/supabase";
import { StoreBranding } from "@/lib/types/store/store";

// Public: read from the storefront layout for every request, so this is
// intentionally the same short-cache pattern as getStoreSettings.ts.
const CACHE_DURATION = 30 * 1000; // 30 seconds
const cache = new Map<
  string,
  { promise: Promise<StoreBranding | null>; timestamp: number }
>();

export async function getStoreBranding(store_id: string): Promise<StoreBranding | null> {
  const cached = cache.get(store_id);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.promise;
  }

  const promise = (async () => {
    // No row is the common case (a store that hasn't opened Storefront
    // Design yet) — not an error, just "use the app's defaults".
    const { data, error } = await supabase
      .from("store_branding")
      .select("id, store_id, theme_palette, announcement_text, created_at, updated_at")
      .eq("store_id", store_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching store branding:", error);
      return null;
    }
    return (data as StoreBranding) ?? null;
  })().catch((err) => {
    cache.delete(store_id);
    throw err;
  });

  cache.set(store_id, { promise, timestamp: Date.now() });
  return promise;
}

/** Call after saving the Storefront Design page so the next read isn't served stale data from the cache above. */
export function invalidateStoreBrandingCache(store_id: string) {
  cache.delete(store_id);
}
