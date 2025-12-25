// lib/queries/stores/getStoreBySlug.ts
import { supabase } from "@/lib/supabase";
import { StoreData } from "@/lib/types/store/store";

export async function getStoreBySlug(
  store_slug: string
): Promise<StoreData | null> {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("store_slug", store_slug)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching store data:", error);
      return null;
    }

    if (!data) {
      console.error("No store found for slug:", store_slug);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getStoreBySlug:", error);
    return null;
  }
}
