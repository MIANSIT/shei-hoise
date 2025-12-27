// lib/queries/stores/getStoreBySlugWithLogo.ts
import { supabase } from "@/lib/supabase";

export interface StoreWithLogo {
  id: string;
  store_name: string;
  store_slug: string;
  logo_url: string | null;
  description: string | null;
  created_at: string; // <-- Add this
}

// Cache for store data
const storeCache = new Map<
  string,
  { data: StoreWithLogo | null; timestamp: number }
>();
const STORE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function getStoreBySlugWithLogo(
  store_slug: string
): Promise<StoreWithLogo | null> {
  // Check cache first
  const cached = storeCache.get(store_slug);
  if (cached && Date.now() - cached.timestamp < STORE_CACHE_DURATION) {
    console.log("📦 Returning cached store for:", store_slug);
    return cached.data;
  }

  try {
    console.log("🔄 Fetching store for slug:", store_slug);

    const { data, error } = await supabase
      .from("stores")
      .select("id, store_name, store_slug, logo_url, description,created_at")
      .eq("store_slug", store_slug)
      .single();

    if (error) {
      console.error("❌ Error fetching store info:", error);
      // Cache null result
      storeCache.set(store_slug, { data: null, timestamp: Date.now() });
      return null;
    }

    console.log("✅ Store found:", data);
    // Cache the successful result
    storeCache.set(store_slug, { data: data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error("❌ Error fetching store:", error);
    throw new Error(
      `Failed to fetch store: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function clearStoreCache(storeSlug?: string) {
  if (storeSlug) {
    storeCache.delete(storeSlug);
  } else {
    storeCache.clear();
  }
}
