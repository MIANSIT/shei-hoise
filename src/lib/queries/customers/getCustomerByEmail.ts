// lib/queries/customers/getCustomerByEmail.ts
import { supabaseAdmin } from "@/lib/supabase";

export async function getCustomerByEmail(email: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('user_type', 'customer')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking customer:', error);
      throw error;
    }

    return data; // returns null if no customer found
  } catch (error) {
    console.error('Error in getCustomerByEmail:', error);
    throw error;
  }
}