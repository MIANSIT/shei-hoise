/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/customers/getStoreCustomersSimple.ts
import { supabase } from "../../../lib/supabase";
import { CustomerProfile } from "../../../lib/types/customer";
import { DetailedCustomer } from "../../../lib/types/users";

// Keep the StoreCustomer interface for backward compatibility
export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  store_id?: string;
  user_type?: string;
  profile_id?: string | null;
  profile?: CustomerProfile;
  address?: string;
  source: "direct";
  profile_details?: {
    date_of_birth?: string | null;
    gender?: string | null;
    address_line_1?: string | null;
    address?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export async function getStoreCustomersSimple(
  storeId: string
): Promise<DetailedCustomer[]> {
  try {
    console.log("🔄 DEBUG [getStoreCustomersSimple]: Fetching customers for store:", storeId);

    // Get customers linked to this store via store_customer_links
    // CHANGED: customer_profiles!inner → customer_profiles (left join instead of inner join)
    const { data, error } = await supabase
      .from("store_customer_links")
      .select(`
        customer_id,
        store_customers!inner(
          id,
          name,
          email,
          phone,
          profile_id,
          created_at,
          updated_at,
          customer_profiles (
            id,
            date_of_birth,
            gender,
            address,
            address_line_1,
            address_line_2,
            city,
            state,
            postal_code,
            country
          )
        )
      `)
      .eq("store_id", storeId);

    if (error) {
      console.error("❌ DEBUG [getStoreCustomersSimple]: Error fetching customer links:", {
        message: error.message,
        details: error.details,
        code: error.code,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ DEBUG [getStoreCustomersSimple]: Found ${data?.length || 0} customer links`);

    if (!data || data.length === 0) {
      console.log("📭 DEBUG [getStoreCustomersSimple]: No customers found for store:", storeId);
      return [];
    }

    const storeCustomers: DetailedCustomer[] = data.map((item: any) => {
      const customer = item.store_customers;
      
      console.log("🔍 DEBUG [getStoreCustomersSimple]: Processing customer:", {
        id: customer.id,
        name: customer.name,
        profile_id: customer.profile_id,
        hasCustomerProfiles: !!customer.customer_profiles
      });

      // Handle customer_profiles - it might be an array or single object
      let customerProfile = null;
      if (customer.customer_profiles) {
        if (Array.isArray(customer.customer_profiles) && customer.customer_profiles.length > 0) {
          customerProfile = customer.customer_profiles[0];
        } else if (typeof customer.customer_profiles === 'object') {
          customerProfile = customer.customer_profiles;
        }
      }

      const formatAddress = (profile: any): string | null => {
        if (!profile) return null;
        const parts = [
          profile.address || profile.address_line_1,
          profile.city,
          profile.state,
          profile.postal_code,
          profile.country,
        ].filter((part): part is string => part != null && part !== "");
        return parts.length > 0 ? parts.join(", ") : null;
      };

      const address = formatAddress(customerProfile);

      // Split name into first and last name for compatibility
      const nameParts = customer.name?.split(' ') || [];
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      const result = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        address: address || undefined,
        status: "active" as const,
        order_count: 0,
        source: "direct" as const,
        first_name: firstName,
        last_name: lastName,
        user_type: "customer",
        profile_id: customer.profile_id,
        profile_details: customerProfile
          ? {
              date_of_birth: customerProfile.date_of_birth || null,
              gender: customerProfile.gender || null,
              address_line_1: customerProfile.address_line_1 || null,
              address: customerProfile.address || null,
              address_line_2: customerProfile.address_line_2 || null,
              city: customerProfile.city || null,
              state: customerProfile.state || null,
              postal_code: customerProfile.postal_code || null,
              country: customerProfile.country || null,
            }
          : null,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      };

      console.log("✅ DEBUG [getStoreCustomersSimple]: Customer processed:", {
        id: result.id,
        name: result.name,
        profile_id: result.profile_id,
        hasProfileDetails: !!result.profile_details
      });

      return result;
    });

    console.log(`✅ DEBUG [getStoreCustomersSimple]: Returning ${storeCustomers.length} customers`);
    
    // Log customers with and without profiles
    const withProfiles = storeCustomers.filter(c => c.profile_id);
    const withoutProfiles = storeCustomers.filter(c => !c.profile_id);
    
    console.log("📊 DEBUG [getStoreCustomersSimple]: Profile summary:", {
      total: storeCustomers.length,
      withProfiles: withProfiles.length,
      withoutProfiles: withoutProfiles.length,
      withoutProfileIds: withoutProfiles.map(c => ({ id: c.id, name: c.name }))
    });

    return storeCustomers;

  } catch (error: any) {
    console.error("💥 DEBUG [getStoreCustomersSimple]: Error:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    throw error;
  }
}