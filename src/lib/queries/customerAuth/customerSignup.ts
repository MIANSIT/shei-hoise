import { supabase } from "@/lib/supabase";

export const signupQueries = {
  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      const { data: customer, error } = await supabase
        .from("store_customers")
        .select("email")
        .eq("email", email.toLowerCase())
        .limit(1);
      
      if (error) throw error;
      return !!customer && customer.length > 0;
    } catch (err) {
      console.error("Error checking email:", err);
      throw err;
    }
  },

  createAuthUser: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: { data: { email: email.toLowerCase(), role: "customer" } },
    });

    if (error) throw error;
    return data;
  },

  autoLogin: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      console.error("Auto-login failed:", error);
      return null;
    }
    return data;
  },

  getStoreBySlug: async (storeSlug: string) => {
    const { data: store, error } = await supabase
      .from("stores")
      .select("id")
      .eq("store_slug", storeSlug)
      .single();

    if (error) throw error;
    return store;
  },

  createCustomer: async (email: string, authUserId?: string) => {
    const { data: customer, error } = await supabase
      .from("store_customers")
      .insert({
        email: email.toLowerCase(),
        auth_user_id: authUserId,
        name: email.split("@")[0],
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create customer:", error);
      // If customer already exists, try to fetch existing one
      const { data: existingCustomer } = await supabase
        .from("store_customers")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();
      
      return existingCustomer;
    }
    
    return customer;
  },

  createStoreCustomerLink: async (customerId: string, storeId: string) => {
    const { error } = await supabase
      .from("store_customer_links")
      .insert({ customer_id: customerId, store_id: storeId });

    if (error) {
      console.error("Failed to create store-customer link:", error);
      // Link might already exist, which is fine
    }
  },
};