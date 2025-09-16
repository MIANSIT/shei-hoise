"use server";

import { supabase } from "@/lib/supabase";

/**
 * Delete a category by ID and store ID
 */
export async function deleteCategory(categoryId: string, store_id: string) {
  try {
    // Optional: you can check if category exists and belongs to the store
    const { data: existingCategory, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("store_id", store_id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingCategory) throw new Error("Category not found or does not belong to your store");

    // Delete the category
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("store_id", store_id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (err) {
    console.error("deleteCategory failed:", err);
    throw err;
  }
}
