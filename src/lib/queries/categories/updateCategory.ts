"use server";

import { updateCategorySchema, type UpdateCategoryType } from "@/lib/schema/category.schema";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { uploadCategoryImage, deleteCategoryImage } from "@/lib/utils/categoryImageStorage";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- _store_id is caller-supplied and never trusted; the real store is resolved from the session below
export async function updateCategory(
  data: UpdateCategoryType,
  _store_id: string,
  // undefined = leave the existing image alone, null = clear it, File = replace it.
  imageFile?: File | null,
) {
  const supabase = createClient();
  const payload = updateCategorySchema.parse(data);

  // payload.id is caller-supplied — scope the update to a category that
  // actually belongs to the caller's own store.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const store_id = storeResult.storeId;

  try {
    // Needed to know the old file to delete once the new one is safely saved.
    const { data: existing } = await supabase
      .from("categories")
      .select("image_url")
      .eq("id", payload.id)
      .eq("store_id", store_id)
      .maybeSingle();

    const imageUpdate =
      imageFile === undefined
        ? {}
        : imageFile === null
          ? { image_url: null }
          : { image_url: await uploadCategoryImage(imageFile, store_id, payload.id) };

    const { error } = await supabase
      .from("categories")
      .update({
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        parent_id: payload.parent_id ?? null,
        is_active: payload.is_active,
        ...imageUpdate,
      })
      .eq("id", payload.id)
      .eq("store_id", store_id);

    if (error) {
      console.error("Category update error:", error);
      throw error;
    }

    // Only clean up the old file once the row update has committed, and only
    // when the image actually changed (replaced or explicitly cleared).
    if (imageFile !== undefined && existing?.image_url) {
      await deleteCategoryImage(existing.image_url);
    }

    return { success: true, id: payload.id };
  } catch (err) {
    console.error("updateCategory failed:", err);
    throw err;
  }
}
