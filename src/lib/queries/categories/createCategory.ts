"use server";

import {
  createCategorySchema,
  type CreateCategoryType,
} from "@/lib/schema/category.schema";
import { supabase } from "@/lib/supabase";

export async function createCategory(data: CreateCategoryType) {
  const payload = createCategorySchema.parse(data);

  try {
    const { data: insertData, error } = await supabase
      .from("categories")
      .insert({
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        parent_id: payload.parent_id ?? null,
        // image: payload.image ?? null,
        is_active: payload.is_active,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Category insert error:", error);
      throw error;
    }

    return { success: true, id: insertData.id };
  } catch (err) {
    console.error("createCategory failed:", err);
    throw err;
  }
}
