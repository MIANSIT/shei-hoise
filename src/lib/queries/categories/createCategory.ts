"use server";

import { createCategorySchema, type CreateCategoryType } from "@/lib/schema/category.schema";
import { supabase } from "@/lib/supabase";

export async function createCategory(data: CreateCategoryType, store_id: string) {
  const payload = createCategorySchema.parse(data);

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

  return { success: true, id: insertData.id };
}
