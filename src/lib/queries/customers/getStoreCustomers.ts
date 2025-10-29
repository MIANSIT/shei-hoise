// lib/queries/customers/getStoreCustomersSimple.ts
import { supabase } from "../../../lib/supabase";
import { CurrentUser } from "../../../lib/types/users";

// StoreCustomer should extend CurrentUser which already has these properties
export interface StoreCustomer extends CurrentUser {
  profile?: {
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export async function getStoreCustomersSimple(storeId: string): Promise<StoreCustomer[]> {
  try {
    console.log('Fetching simple customer list for store:', storeId);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, phone, store_id, user_type')
      .eq('store_id', storeId)
      .eq('user_type', 'customer')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Simple customer query error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} simple customers`);

    // Cast the data to StoreCustomer[] since it matches the CurrentUser interface
    return (data || []) as StoreCustomer[];

  } catch (error) {
    console.error('Unexpected error in simple customer query:', error);
    throw error;
  }
}