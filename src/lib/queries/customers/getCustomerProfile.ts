import { supabaseAdmin } from "@/lib/supabase";

export interface CustomerProfile {
  user_id: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  try {
    console.log('Fetching profile for customer:', customerId);
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', customerId)
      .single();

    if (error) {
      console.log('No profile found for customer:', error.message);
      return null;
    }

    console.log('Profile found:', profile);
    return profile;
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    throw new Error(`Failed to fetch customer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}