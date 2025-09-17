import { supabase } from "@/lib/supabase";

/**
 * Fetch categories for a given store_id
 */
export async function getCategoriesQuery(storeId: string) {
  return supabase
    .from("categories")
    .select("id,name,slug,description,parent_id,is_active,created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
}
