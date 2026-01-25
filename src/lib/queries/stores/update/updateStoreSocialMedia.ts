import { supabase } from "@/lib/supabase";
import type { UpdatedStoreSocialMedia } from "@/lib/types/store/store";

export async function updateStoreSocialMedia(
  store_id: string,
  data: UpdatedStoreSocialMedia,
) {
  const { data: result, error } = await supabase
    .from("store_social_media")
    .upsert(
      {
        store_id,
        ...data,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "store_id",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Error updating store social media:", error);
    throw error;
  }

  return result;
}
