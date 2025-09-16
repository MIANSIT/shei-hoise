"use server";

import { updateCategorySchema, type UpdateCategoryType } from "@/lib/schema/category.schema";
import { supabase } from "@/lib/supabase";

export async function updateCategory(data: UpdateCategoryType, store_id: string) {
  const payload = updateCategorySchema.parse(data);

  try {
    const { error } = await supabase
      .from("categories")
      .update({
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        parent_id: payload.parent_id ?? null,
        is_active: payload.is_active,
        store_id, 
      })
      .eq("id", payload.id);

    if (error) {
      console.error("Category update error:", error);
      throw error;
    }

    return { success: true, id: payload.id };
  } catch (err) {
    console.error("updateCategory failed:", err);
    throw err;
  }
}
