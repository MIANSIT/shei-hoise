// lib/queries/customers/getCustomerByEmail.ts
import { supabaseAdmin } from "@/lib/supabase";

export async function getCustomerByEmail(email: string, store_slug?: string) {
  try {
    let query = supabaseAdmin
      .from("store_customers")
      .select(`
        *,
        user_profiles (*),
        store_customer_links (
          store_id,
          stores!store_customer_links_store_id_fkey (
            id,
            store_slug,
            store_name
          )
        )
      `)
      .eq("email", email.toLowerCase());

    // If store_slug is provided, filter by store
    if (store_slug) {
      query = query.eq("store_customer_links.stores.store_slug", store_slug);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Error fetching customer by email:", error);
      return null;
    }

    console.log("📧 Customer found:", {
      id: data?.id,
      email: data?.email,
      auth_user_id: data?.auth_user_id,
      profile_id: data?.profile_id,
      hasProfile: !!data?.user_profiles,
      storeLinks: data?.store_customer_links?.length || 0
    });

    return data;
  } catch (error) {
    console.error("Error in getCustomerByEmail:", error);
    return null;
  }
}