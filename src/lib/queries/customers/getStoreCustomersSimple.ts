// lib/queries/customers/getStoreCustomersSimple.ts
import { supabase } from "@/lib/supabase";
import { CurrentUser } from "../../../lib/types/users";

// Define proper types for user profile
interface UserProfile {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface StoreCustomer extends CurrentUser {
  address?: string;
  profile?: UserProfile | null;
  order_count?: number;
  last_order_date?: string;
  source?: "direct" | "orders";
}

// Helper function to format address from user_profiles
function formatAddress(
  userProfile: UserProfile | null | undefined
): string | null {
  if (!userProfile) {
    console.log("No userProfile provided to formatAddress");
    return null;
  }

  console.log("Raw userProfile in formatAddress:", userProfile);

  const { address_line_1, address_line_2, city, state, postal_code, country } =
    userProfile;

  const addressParts: string[] = [];

  if (address_line_1) addressParts.push(address_line_1);
  if (address_line_2) addressParts.push(address_line_2);
  if (city) addressParts.push(city);
  if (state) addressParts.push(state);
  if (postal_code) addressParts.push(postal_code);
  if (country) addressParts.push(country);

  const result = addressParts.length > 0 ? addressParts.join(", ") : null;
  console.log("Formatted address result:", result);

  return result;
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

    const customers: StoreCustomer[] = (data || []).map((user) => {
      // Handle user_profiles array - take the first one or null
      const userProfile = Array.isArray(user.user_profiles)
        ? user.user_profiles[0] || null
        : user.user_profiles;

      // Format address from user_profiles
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
      };
    });

    return customers;
  } catch (error) {
    console.error("Unexpected error in simple customer query:", error);
    throw error;
  }
}
