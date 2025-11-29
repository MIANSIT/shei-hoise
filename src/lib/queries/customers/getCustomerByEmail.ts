/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/getCustomerByEmail.ts
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
    console.log("🔍 Searching for customer by email:", { 
      email: email.toLowerCase(),
      store_slug 
    });

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
      console.log("📭 No customer found with email:", email);
      return null;
    }

    console.log("✅ Customer found:", {
      id: customer.id,
      email: customer.email,
      profile_id: customer.profile_id
    });

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
        console.log("✅ Customer profile found:", profile.id);
      } else {
        console.log("📭 No customer profile found for profile_id:", customer.profile_id);
      }
    } else {
      console.log("📭 No profile_id for customer");
    }

    // Step 3: Get store links - fix the type issue
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
      
      console.log("✅ Store links found:", storeLinks.length);
      
      // Filter by store_slug if provided
      if (store_slug) {
        const filteredLinks = storeLinks.filter(link => 
          link.stores && link.stores.store_slug === store_slug
        );
        console.log("✅ Filtered store links for slug:", store_slug, filteredLinks.length);
        
        // Return combined data with filtered links
        const result: StoreCustomer = {
          ...customer,
          customer_profiles: customerProfile,
          store_customer_links: filteredLinks
        };

        console.log("📦 Final customer data:", {
          id: result.id,
          email: result.email,
          hasProfile: !!result.customer_profiles,
          storeLinksCount: result.store_customer_links.length
        });

        return result;
      }
    }

    // Return combined data with all store links
    const result: StoreCustomer = {
      ...customer,
      customer_profiles: customerProfile,
      store_customer_links: storeLinks
    };

    console.log("📦 Final customer data:", {
      id: result.id,
      email: result.email,
      hasProfile: !!result.customer_profiles,
      storeLinksCount: result.store_customer_links.length
    });

    return result;

  } catch (error: any) {
    console.error("💥 Unexpected error in getCustomerByEmail:", {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}