"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { invalidateStoreFullCache } from "@/lib/queries/stores/getStoreBySlugFull";
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

  // Two caches sit between this write and the storefront footer: the 10-min
  // in-memory cache in getStoreBySlugFull and the 5-min route cache on
  // [store_slug]/layout.tsx. Clear both so removed links disappear immediately.
  invalidateStoreFullCache(store_id);
  revalidatePath("/[store_slug]", "layout");

  return result;
}
