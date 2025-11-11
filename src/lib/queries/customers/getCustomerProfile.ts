// lib/queries/customers/getCustomerProfile.ts
import { supabaseAdmin } from "@/lib/supabase";
import { CustomerProfile } from "@/lib/types/customer";

// Cache implementation
const profileCache = new Map<string, { data: CustomerProfile | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  // Check cache first
  const cached = profileCache.get(customerId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 Returning cached profile for:', customerId);
    return cached.data;
  }

  try {
    console.log('🔄 Fetching profile for customer:', customerId);
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', customerId)
      .single();

    if (error) {
      console.log('❌ No profile found for customer:', error.message);
      // Cache null result to avoid repeated failed requests
      profileCache.set(customerId, { data: null, timestamp: Date.now() });
      return null;
    }

    console.log('✅ Profile found:', profile);
    // Cache the successful result
    profileCache.set(customerId, { data: profile, timestamp: Date.now() });
    return profile;
  } catch (error) {
    console.error('❌ Error fetching customer profile:', error);
    throw new Error(`Failed to fetch customer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Clear cache function (optional)
export function clearProfileCache(customerId?: string) {
  if (customerId) {
    profileCache.delete(customerId);
  } else {
    profileCache.clear();
  }
}