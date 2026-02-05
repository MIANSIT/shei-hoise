/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/getCustomerByPhone.ts - FIXED VERSION
import { supabaseAdmin } from "@/lib/supabase";

interface CustomerProfile {
  id: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface StoreLink {
  store_id: string;
  stores: {
    id: string;
    store_slug: string;
    store_name: string;
  } | null;
}

export interface StoreCustomer {
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

export async function getCustomerByPhone(phone: string, store_slug?: string): Promise<StoreCustomer | null> {
  try {
    

    if (!phone || phone.trim() === '') {
      console.error("❌ Phone is required");
      return null;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanedPhone = phone.replace(/\D/g, '');

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
      .eq("phone", cleanedPhone)
      .maybeSingle();

    if (customerError) {
      console.error("❌ Error fetching customer by phone:", {
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
      }
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
      links.forEach((link: any) => {
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
        const filteredLinks = storeLinks.filter((link: StoreLink) => 
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
    console.error("💥 Unexpected error in getCustomerByPhone:", {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}