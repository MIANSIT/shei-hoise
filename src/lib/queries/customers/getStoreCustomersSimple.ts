// lib/queries/customers/getStoreCustomersSimple.ts
import { supabase } from "@/lib/supabase";
import { CurrentUser } from "../../../lib/types/users";

// Extend CurrentUser interface to include the fields we need
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

    // Return customers without profiles for now
    const customers: StoreCustomer[] = (data || []).map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      phone: user.phone,
      store_id: user.store_id,
      user_type: user.user_type,
      profile: undefined
    }));

    return customers;

  } catch (error) {
    console.error('Unexpected error in simple customer query:', error);
    throw error;
  }
}