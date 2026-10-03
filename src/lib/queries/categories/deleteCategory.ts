"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { deleteCategoryImage } from "@/lib/utils/categoryImageStorage";
import { authorizeForStore, checkDeleteWindow, logDeleted } from "@/lib/permissions/server";

export async function deleteCategoryQuery(categoryId: string, storeId: string) {
  const auth = await authorizeForStore(storeId, "categories.delete");
  if (!auth.ok) throw new Error(auth.error);

  const { data: existingCategory, error: fetchError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .single();

  if (fetchError) throw fetchError;
  if (!existingCategory) throw new Error("Category not found or unauthorized");

  const tooOld = checkDeleteWindow(auth.actor, existingCategory.created_at);
  if (tooOld) throw new Error(tooOld);

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", storeId);

  if (deleteError) throw deleteError;

  await logDeleted(auth.actor, "categories", "category", existingCategory, `Deleted category ${existingCategory.name}`);

  // Best-effort — the category row is already gone either way, so a storage
  // hiccup here shouldn't surface as a failed delete to the caller.
  await deleteCategoryImage(existingCategory.image_url).catch((err) =>
    console.error("Failed to delete category image from storage:", err),
  );

  return true;
}
