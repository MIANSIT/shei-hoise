import { supabase } from "@/lib/supabase";
import { createSignupCustomer, linkSignupCustomerToStore } from "./customerSignupServer";

export const signupQueries = {
  checkEmailExists: async (email: string): Promise<boolean> => {
    try {
      const { data: exists, error } = await supabase.rpc(
        "check_customer_email_exists",
        { p_email: email.toLowerCase() }
      );

      if (error) throw error;
      return !!exists;
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

    if (error) {
      // Auth user already exists — sign in instead of failing
      if (error.message.toLowerCase().includes("already registered")) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        });
        if (signInError) throw signInError;
        return signInData;
      }
      throw error;
    }

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

  createCustomer: async (email: string, authUserId?: string, phone?: string) => {
    return createSignupCustomer(email, authUserId, phone);
  },

  createStoreCustomerLink: async (customerId: string, storeId: string) => {
    return linkSignupCustomerToStore(customerId, storeId);
  },
};