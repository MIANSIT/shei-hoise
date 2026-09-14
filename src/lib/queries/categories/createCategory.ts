"use server";

import { createCategorySchema, type CreateCategoryType } from "@/lib/schema/category.schema";
import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { uploadCategoryImage } from "@/lib/utils/categoryImageStorage";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- _store_id is caller-supplied and never trusted; the real store is resolved from the session below
export async function createCategory(data: CreateCategoryType, _store_id: string, imageFile?: File | null) {
  const supabase = createClient();
  const payload = createCategorySchema.parse(data);

  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const store_id = storeResult.storeId;

  const { count: currentCategoryCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id);

  const subscription = await getStoreFeatureSubscription(store_id);
  const limitCheck = checkLimit(subscription, "max_categories", currentCategoryCount ?? 0);
  if (!limitCheck.allowed) {
    throw new Error(
      `You've reached your plan's limit of ${limitCheck.limit} categories. Upgrade your plan to add more.`,
    );
  }

  const { data: insertData, error } = await supabase
    .from("categories")
    .insert({
      ...payload,
      store_id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Category insert error:", error);
    throw error;
  }

  // Uploaded after the insert so the storage path can be keyed by the real
  // category id (store_id/category_id/...), not a throwaway placeholder. A
  // failed upload doesn't roll back the category — it's created without an
  // image, and imageError tells the caller to warn the owner and let them
  // retry the image from the edit form.
  let imageError: string | undefined;
  if (imageFile) {
    try {
      const image_url = await uploadCategoryImage(imageFile, store_id, insertData.id);
      const { error: imageUpdateError } = await supabase
        .from("categories")
        .update({ image_url })
        .eq("id", insertData.id);
      if (imageUpdateError) imageError = imageUpdateError.message;
    } catch (err) {
      imageError = err instanceof Error ? err.message : "Failed to upload category image";
    }
  }

  return { success: true, id: insertData.id, imageError };
}
