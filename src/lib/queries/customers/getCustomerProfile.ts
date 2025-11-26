// lib/queries/customers/getCustomerProfile.ts
import { supabaseAdmin } from "@/lib/supabase";
import { CustomerProfile } from "@/lib/types/customer";

// Cache implementation
const profileCache = new Map<string, { data: CustomerProfile | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ONLY KEEP THIS FUNCTION - Remove the old broken one
export async function getCustomerProfileByStoreCustomerId(storeCustomerId: string): Promise<CustomerProfile | null> {
  // Check cache first
  const cached = profileCache.get(storeCustomerId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 Returning cached profile for store_customer_id:', storeCustomerId);
    return cached.data;
  }

  try {
    console.log('🔄 Fetching profile for store_customer_id:', storeCustomerId);
    
    const { data: profile, error } = await supabaseAdmin
      .from('customer_profiles')
      .select('*')
      .eq('store_customer_id', storeCustomerId)
      .single();

    if (error) {
      console.log('❌ No profile found for store_customer_id:', storeCustomerId, 'Error:', error.message);
      // Cache null result to avoid repeated failed requests
      profileCache.set(storeCustomerId, { data: null, timestamp: Date.now() });
      return null;
    }

    console.log('✅ Profile found by store_customer_id:', profile);
    // Cache the successful result
    profileCache.set(storeCustomerId, { data: profile, timestamp: Date.now() });
    return profile;
  } catch (error) {
    console.error('❌ Error fetching customer profile by store_customer_id:', error);
    return null;
  }
}

// Clear cache function
export function clearProfileCache(storeCustomerId?: string) {
  if (storeCustomerId) {
    profileCache.delete(storeCustomerId);
  } else {
    profileCache.clear();
  }
}