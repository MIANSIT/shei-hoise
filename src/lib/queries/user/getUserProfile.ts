// lib/queries/user/getUserProfile.ts
import { supabase } from "@/lib/supabase";

// Make sure avatar_url and other optional fields are string | null
export interface CustomerProfile {
  id: string;
  store_customer_id: string;
  avatar_url: string | null; // no undefined
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  address_line_1?: string | null; // optional for backward compatibility
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
  user_type: "customer"
}

export async function getUserProfile(
  customerId: string
): Promise<UserWithProfile> {
  const { data: customerData, error: customerError } = await supabase
    .from("store_customers")
    .select(`*, customer_profiles (*)`)
    .eq("id", customerId)
    .single();

  if (customerError)
    throw new Error(
      `Failed to fetch customer profile: ${customerError.message}`
    );

  const { data: linkData } = await supabase
    .from("store_customer_links")
    .select("store_id")
    .eq("customer_id", customerId)
    .single();

  let storeSlug: string | null = null;
  let storeName: string | null = null;

  if (linkData?.store_id) {
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("store_slug, store_name")
      .eq("id", linkData.store_id)
      .single();

    if (!storeError && storeData) {
      storeSlug = storeData.store_slug;
      storeName = storeData.store_name;
    }
  }

  // Ensure all fields are non-undefined
  const profile = customerData.customer_profiles?.[0] || null;
  if (profile) {
    profile.avatar_url = profile.avatar_url ?? null;
    profile.date_of_birth = profile.date_of_birth ?? null;
    profile.gender = profile.gender ?? null;
    profile.address = profile.address ?? null;
    profile.city = profile.city ?? null;
    profile.state = profile.state ?? null;
    profile.postal_code = profile.postal_code ?? null;
    profile.country = profile.country ?? null;
  }

  return {
    ...customerData,
    profile,
    store_slug: storeSlug,
    store_name: storeName,
  };
}
