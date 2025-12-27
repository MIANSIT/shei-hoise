// lib/queries/stores/getStoreSettings.ts
import { supabase } from "@/lib/supabase";
import { StoreSettings } from "@/lib/types/store/store";

export async function getStoreSettings(
  store_id: string
): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store_id)
    .single();

  if (error) {
    console.error("Error fetching store settings:", error);
    return null;
  }

  if (!data) {
    console.error("No store settings found for store ID:", store_id);
    return null;
  }

  return data;
}
