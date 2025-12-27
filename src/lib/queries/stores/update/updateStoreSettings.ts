import { supabase } from "@/lib/supabase";
import type {
  UpdatedStoreSettings,
  StoreSettings,
} from "@/lib/types/store/store";

export async function updateStoreSettings(
  storeId: string,
  payload: UpdatedStoreSettings
): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating store settings:", error);
    return null;
  }

  return data;
}
