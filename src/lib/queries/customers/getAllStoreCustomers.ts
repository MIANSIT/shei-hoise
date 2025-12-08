import { DetailedCustomer } from "@/lib/types/users";
import { supabase } from "@/lib/supabase";

// Define proper response types
interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

interface StoreCustomerLinkResponse {
  customer_id: string;
}

interface CustomerProfileResponse {
  id: string;
  store_customer_id: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null; // This is the field name in your database
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

interface StoreCustomerResponse {
  id: string;
  name?: string;
  email: string;
  phone?: string | null;
  profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
  customer_profiles: CustomerProfileResponse[];
}

export async function getAllStoreCustomers(
  storeId: string
): Promise<DetailedCustomer[]> {
  if (!storeId) throw new Error("Store ID is required");

  try {
    // Step 1: Get linked customer IDs
    const { data: links, error: linkError } = (await supabase
      .from("store_customer_links")
      .select("customer_id")
      .eq("store_id", storeId)) as SupabaseResponse<
      StoreCustomerLinkResponse[]
    >;

    if (linkError) throw linkError;
    if (!links || links.length === 0) return [];

    const customerIds = links.map(
      (link: StoreCustomerLinkResponse) => link.customer_id
    );

    // Step 2: Fetch customers with profile
    const { data: customers, error: customerError } = (await supabase
      .from("store_customers")
      .select(
        `id, name, email, phone, profile_id, created_at, updated_at,
         customer_profiles!customer_profiles_store_customer_id_fkey(*)`
      )
      .in("id", customerIds)
      .order("created_at", { ascending: true })) as SupabaseResponse<
      StoreCustomerResponse[]
    >;

    if (customerError) throw customerError;
    if (!customers) return [];

    // Step 3: Transform to DetailedCustomer
    const detailedCustomers: DetailedCustomer[] = customers.map(
      (c: StoreCustomerResponse) => {
        const profiles = c.customer_profiles || [];
        const profile = profiles[0] || null;

        console.log("📊 Customer profile data:", profile); // Debug log

        return {
          id: c.id,
          name: c.name || "Unknown Customer",
          email: c.email,
          phone: c.phone || undefined,
          status: "active",
          order_count: 0,
          source: "direct",
          user_type: "customer",
          created_at: c.created_at,
          updated_at: c.updated_at,
          profile_id: c.profile_id || null,
          profile_details: profile
            ? {
                date_of_birth: profile.date_of_birth || null,
                gender: profile.gender || null,
                address_line_1: profile.address || null,
                address_line_2: null,
                city: profile.city || null,
                state: profile.state || null,
                postal_code: profile.postal_code || null,
                country: profile.country || null,
                address: profile.address || null,
              }
            : null,
        };
      }
    );

    console.log("✅ getAllStoreCustomers result:", detailedCustomers); // Debug log
    return detailedCustomers;
  } catch (error) {
    console.error("Error fetching store customers:", error);
    throw error;
  }
}
