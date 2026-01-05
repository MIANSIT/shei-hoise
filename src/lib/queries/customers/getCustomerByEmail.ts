/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/getCustomerByEmail.ts - UPDATED
import { supabaseAdmin } from "@/lib/supabase";

// Define types for the store customer links
interface StoreLink {
  store_id: string;
  stores: {
    id: string;
    store_slug: string;
    store_name: string;
  } | null;
}

interface CustomerProfile {
  id: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface StoreCustomer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  auth_user_id: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  customer_profiles?: CustomerProfile | null;
  store_customer_links: StoreLink[];
}

export async function getCustomerByEmail(email: string, store_slug?: string): Promise<StoreCustomer | null> {
  try {
    

    if (!email || email.trim() === '') {
      console.error("❌ Email is required");
      return null;
    }

    // Step 1: First get the customer basic info
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("store_customers")
      .select(`
        id,
        name,
        email,
        phone,
        auth_user_id,
        profile_id,
        created_at,
        updated_at
      `)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (customerError) {
      console.error("❌ Error fetching customer:", {
        message: customerError.message,
        details: customerError.details,
        code: customerError.code
      });
      return null;
    }

    if (!customer) {
      return null;
    }

    

    // Step 2: Get customer profile if exists
    let customerProfile: CustomerProfile | null = null;
    if (customer.profile_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("customer_profiles")
        .select("*")
        .eq("id", customer.profile_id)
        .maybeSingle();

      if (profileError) {
        console.error("❌ Error fetching customer profile:", profileError);
      } else if (profile) {
        customerProfile = profile;
      } else {
      }
    } else {
    }

    // Step 3: Get store links
    const storeLinks: StoreLink[] = [];
    const { data: links, error: linksError } = await supabaseAdmin
      .from("store_customer_links")
      .select(`
        store_id,
        stores (
          id,
          store_slug,
          store_name
        )
      `)
      .eq("customer_id", customer.id);

    if (linksError) {
      console.error("❌ Error fetching store links:", linksError);
    } else if (links) {
      // Transform the data to match our StoreLink interface
      links.forEach(link => {
        // Supabase returns stores as an array, but we expect a single object
        const storeData = Array.isArray(link.stores) ? link.stores[0] : link.stores;
        
        storeLinks.push({
          store_id: link.store_id,
          stores: storeData ? {
            id: storeData.id,
            store_slug: storeData.store_slug,
            store_name: storeData.store_name
          } : null
        });
      });
      
      
      // Filter by store_slug if provided
      if (store_slug) {
        const filteredLinks = storeLinks.filter(link => 
          link.stores && link.stores.store_slug === store_slug
        );
        
        // Return combined data with filtered links
        const result: StoreCustomer = {
          ...customer,
          customer_profiles: customerProfile,
          store_customer_links: filteredLinks
        };

       

        return result;
      }
    }

    // Return combined data with all store links
    const result: StoreCustomer = {
      ...customer,
      customer_profiles: customerProfile,
      store_customer_links: storeLinks
    };

    

    return result;

  } catch (error: any) {
    console.error("💥 Unexpected error in getCustomerByEmail:", {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

// NEW FUNCTION: Link auth user to existing customer
export async function linkAuthToCustomer(customerId: string, authUserId: string): Promise<boolean> {
  try {
    
    const { error } = await supabaseAdmin
      .from("store_customers")
      .update({
        auth_user_id: authUserId,
        updated_at: new Date().toISOString()
      })
      .eq("id", customerId);

    if (error) {
      console.error("❌ Failed to link auth user:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("💥 Error linking auth user:", error);
    return false;
  }
}

// NEW FUNCTION: Get customer by auth user ID
export async function getCustomerByAuthUserId(authUserId: string, store_slug?: string): Promise<StoreCustomer | null> {
  try {
    
    // First try to find customer by auth_user_id
    const { data: customer, error } = await supabaseAdmin
      .from("store_customers")
      .select(`
        id,
        name,
        email,
        phone,
        auth_user_id,
        profile_id,
        created_at,
        updated_at
      `)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching customer by auth_user_id:", error);
      return null;
    }

    if (!customer) {
      return null;
    }

    

    // Get store links
    const { data: links } = await supabaseAdmin
      .from("store_customer_links")
      .select(`
        store_id,
        stores (
          id,
          store_slug,
          store_name
        )
      `)
      .eq("customer_id", customer.id);

    const storeLinks: StoreLink[] = links?.map(link => ({
      store_id: link.store_id,
      stores: Array.isArray(link.stores) ? link.stores[0] : link.stores
    })) || [];

    // Filter by store_slug if provided
    const filteredLinks = store_slug 
      ? storeLinks.filter(link => link.stores?.store_slug === store_slug)
      : storeLinks;

    return {
      ...customer,
      customer_profiles: null, // We'll fetch this if needed
      store_customer_links: filteredLinks
    };
  } catch (error) {
    console.error("💥 Error in getCustomerByAuthUserId:", error);
    return null;
  }
}