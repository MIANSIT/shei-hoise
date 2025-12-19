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
      const { data: customers, error } = await supabase
        .from("store_customers")
        .select(`
          id,
          email,
          auth_user_id,
          store_customer_links!inner(
            stores!inner(
              store_slug
            )
          )
        `)
        .eq("email", email.toLowerCase())
        .limit(1);

      if (error) throw error;

      if (!customers || customers.length === 0) {
        return null;
      }

      const customer = customers[0];
      const storeSlugs = customer.store_customer_links?.map(
        (link: any) => link.stores?.store_slug
      ).filter(Boolean) || [];

      return {
        id: customer.id,
        email: customer.email,
        auth_user_id: customer.auth_user_id,
        store_slugs: storeSlugs,
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