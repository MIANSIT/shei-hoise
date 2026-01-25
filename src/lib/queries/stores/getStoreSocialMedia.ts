// /lib/queries/stores/getStoreSocialMedia.ts
import { supabase } from "@/lib/supabase";
import type { StoreSocialMedia } from "@/lib/types/store/store";

export async function getStoreSocialMedia(
  store_id: string,
): Promise<StoreSocialMedia | null> {
  if (!store_id) return null;

  const { data, error } = await supabase
    .from("store_social_media")
    .select("*")
    .eq("store_id", store_id)
    .maybeSingle(); // safer than .single()

  if (error) {
    console.error(
      "Error fetching store social media:",
      error.message,
      error.details,
    );
    return null;
  }

  return data;
}
