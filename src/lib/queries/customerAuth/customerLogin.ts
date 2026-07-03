// lib/queries/customerAuth/customerLogin.ts - FIXED
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";

export interface CustomerData {
  id: string;
  email: string;
  auth_user_id: string | null;
  store_slugs: string[];
}

export const authQueries = {
  checkEmail: async (email: string): Promise<CustomerData | null> => {
    try {
      const { data: customers, error } = await supabase.rpc(
        "find_customer_login_info",
        { p_email: email.toLowerCase() }
      );

      if (error) throw error;

      if (!customers || customers.length === 0) {
        return null;
      }

      const customer = customers[0] as {
        id: string;
        email: string;
        auth_user_id: string | null;
        store_slugs: string[] | null;
      };

      return {
        id: customer.id,
        email: customer.email,
        auth_user_id: customer.auth_user_id,
        store_slugs: customer.store_slugs || [],
      };
    } catch (err) {
      console.error("Error checking email:", err);
      throw err;
    }
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      throw error;
    }

    return data;
  },
};