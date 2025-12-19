// lib/queries/user/getUserProfile.ts
import { supabase } from "@/lib/supabase";
import { USERTYPE } from "@/lib/types/users";

export interface CustomerProfile {
  id: string;
  store_customer_id: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  auth_user_id: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  profile: CustomerProfile | null;
  store_slug: string | null;
  store_name: string | null;
  user_type: USERTYPE;
  is_active: boolean; // ✅ Add this
}

export async function getUserProfile(
  customerId: string
): Promise<UserWithProfile> {
  // Get customer data
  const { data: customerData, error: customerError } = await supabase
    .from("store_customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (customerError) {
    console.error("Error fetching customer:", customerError);
    throw new Error(
      `Failed to fetch customer profile: ${customerError.message}`
    );
  }

  // Get profile data separately
  let profile: CustomerProfile | null = null;
  if (customerData.profile_id) {
    const { data: profileData, error: profileError } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("id", customerData.profile_id)
      .single();

    if (!profileError && profileData) {
      profile = {
        ...profileData,
        avatar_url: profileData.avatar_url ?? null,
        date_of_birth: profileData.date_of_birth ?? null,
        gender: profileData.gender ?? null,
        address: profileData.address ?? null,
        city: profileData.city ?? null,
        state: profileData.state ?? null,
        postal_code: profileData.postal_code ?? null,
        country: profileData.country ?? null,
      };
    }
  }

  // Get store link information
  let storeSlug: string | null = null;
  let storeName: string | null = null;

  const { data: linkData } = await supabase
    .from("store_customer_links")
    .select("store_id")
    .eq("customer_id", customerId)
    .limit(1);

  if (linkData && linkData.length > 0) {
    const { data: storeData } = await supabase
      .from("stores")
      .select("store_slug, store_name")
      .eq("id", linkData[0].store_id)
      .single();

    if (storeData) {
      storeSlug = storeData.store_slug;
      storeName = storeData.store_name;
    }
  }

  // Ensure all fields are properly typed
  return {
    id: customerData.id,
    name: customerData.name || "",
    phone: customerData.phone || null,
    email: customerData.email || "",
    auth_user_id: customerData.auth_user_id || null,
    profile_id: customerData.profile_id || null,
    created_at: customerData.created_at || new Date().toISOString(),
    updated_at: customerData.updated_at || new Date().toISOString(),
    profile: profile,
    store_slug: storeSlug,
    store_name: storeName,
    user_type: USERTYPE.CUSTOMER, // Store customers are always customers
    is_active: customerData.is_active ?? true, // ✅ make sure to map it
  };
}
