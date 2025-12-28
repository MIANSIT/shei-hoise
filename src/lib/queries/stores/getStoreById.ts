// lib/queries/stores/getStoreById.ts
import { supabase } from "@/lib/supabase";
import { StoreData } from "@/lib/types/store/store";

export async function getStoreById(storeId: string): Promise<StoreData | null> {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching store by ID:", error);
      return null;
    }

    if (!data) {
      console.error("No store found for ID:", storeId);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getStoreById:", error);
    return null;
  }
}
