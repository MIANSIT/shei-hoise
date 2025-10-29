import { supabase } from "@/lib/supabase";

export async function getStoreIdBySlug(store_slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("store_slug", store_slug)
    .single(); // get single row

  if (error) {
    console.error("Error fetching store ID:", error);
    return null;
  }

  if (!data) {
    console.error("No store found for slug:", store_slug);
    return null;
  }

  return data.id;
}
