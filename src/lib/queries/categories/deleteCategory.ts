import { supabase } from "@/lib/supabase";
export async function deleteCategoryQuery(categoryId: string, storeId: string) {
  const { data: existingCategory, error: fetchError } = await supabase
    .from("categories")
    .select("id")
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
  return true;
}
