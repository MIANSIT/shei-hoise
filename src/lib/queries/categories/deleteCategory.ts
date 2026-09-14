"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { deleteCategoryImage } from "@/lib/utils/categoryImageStorage";

export async function deleteCategoryQuery(categoryId: string, storeId: string) {
  const { data: existingCategory, error: fetchError } = await supabase
    .from("categories")
    .select("id, image_url")
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .single();

  if (fetchError) throw fetchError;
  if (!existingCategory) throw new Error("Category not found or unauthorized");

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", storeId);

  if (deleteError) throw deleteError;

  // Best-effort — the category row is already gone either way, so a storage
  // hiccup here shouldn't surface as a failed delete to the caller.
  await deleteCategoryImage(existingCategory.image_url).catch((err) =>
    console.error("Failed to delete category image from storage:", err),
  );

  return true;
}
