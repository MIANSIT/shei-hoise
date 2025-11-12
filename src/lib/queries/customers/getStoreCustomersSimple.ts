// lib/queries/customers/getStoreCustomersSimple.ts
import { supabase } from "@/lib/supabase";
import { CustomerProfile } from "@/lib/types/customer";

export interface StoreCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  store_id: string;
  user_type: string;
  profile?: CustomerProfile;
  address?: string;
  source: "direct";
  profile_details?: {
    date_of_birth?: string | null;
    gender?: string | null;
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}

interface UserProfile {
  user_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface UserWithProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  store_id: string;
  user_type: string;
  user_profiles: UserProfile[] | null;
}

interface AddressFields {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export async function getStoreCustomersSimple(
  storeId: string
): Promise<StoreCustomer[]> {
  try {
    console.log("Fetching simple customer list for store:", storeId);

    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        store_id, 
        user_type,
        user_profiles (
          user_id,
          date_of_birth,
          gender,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country
        )
      `
      )
      .eq("store_id", storeId)
      .eq("user_type", "customer")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Simple customer query error:", error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} simple customers`);

    const formatAddress = (profile: AddressFields | null): string | null => {
      if (!profile) return null;

      const parts = [
        profile.address_line_1,
        profile.address_line_2,
        profile.city,
        profile.state,
        profile.postal_code,
        profile.country,
      ].filter((part): part is string => part != null && part !== "");

      return parts.length > 0 ? parts.join(", ") : null;
    };

    const customers: StoreCustomer[] = (data || []).map(
      (user: UserWithProfile) => {
        const userProfile =
          user.user_profiles && user.user_profiles.length > 0
            ? user.user_profiles[0]
            : null;

        const address = formatAddress(userProfile);

        console.log(`Customer: ${user.first_name} ${user.last_name}`, {
          userProfile,
          formattedAddress: address,
        });

        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          store_id: user.store_id,
          user_type: user.user_type,
          profile: userProfile || undefined,
          address: address || undefined,
          source: "direct" as const,
          profile_details: userProfile
            ? {
                date_of_birth: userProfile.date_of_birth || null,
                gender: userProfile.gender || null,
                address_line_1: userProfile.address_line_1 || null,
                address_line_2: userProfile.address_line_2 || null,
                city: userProfile.city || null,
                state: userProfile.state || null,
                postal_code: userProfile.postal_code || null,
                country: userProfile.country || null,
              }
            : null,
        };
      }
    );

    return customers;
  } catch (error) {
    console.error("Unexpected error in simple customer query:", error);
    throw error;
  }
}
