"use server";
// lib/queries/customers/getCustomerProfile.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { CustomerProfile } from "@/lib/types/customer";

// Cache implementation
const profileCache = new Map<string, { data: CustomerProfile | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ONLY KEEP THIS FUNCTION - Remove the old broken one
export async function getCustomerProfileByStoreCustomerId(storeCustomerId: string): Promise<CustomerProfile | null> {
  try {
    // storeCustomerId is caller-supplied — confirm this customer is actually
    // linked to the caller's own store before reading their profile (and
    // before trusting a cache entry another store's request may have primed).
    const storeResult = await getAuthenticatedStoreId();
    if (!storeResult.ok) return null;

    const { data: link } = await supabaseAdmin
      .from("store_customer_links")
      .select("id")
      .eq("customer_id", storeCustomerId)
      .eq("store_id", storeResult.storeId)
      .maybeSingle();

    if (!link) return null;

    // Check cache only after ownership is confirmed
    const cached = profileCache.get(storeCustomerId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const { data: profile, error } = await supabaseAdmin
      .from('customer_profiles')
      .select('*')
      .eq('store_customer_id', storeCustomerId)
      .single();

    if (error) {
      // Cache null result to avoid repeated failed requests
      profileCache.set(storeCustomerId, { data: null, timestamp: Date.now() });
      return null;
    }

    // Cache the successful result
    profileCache.set(storeCustomerId, { data: profile, timestamp: Date.now() });
    return profile;
  } catch (error) {
    console.error('❌ Error fetching customer profile by store_customer_id:', error);
    return null;
  }
}
