// /lib/queries/expense/updateCategory.ts

import { supabase } from "@/lib/supabase";
import { ExpenseCategory, UpdateCategoryInput } from "@/lib/types/expense/expense";

export async function updateCategory(
  payload: UpdateCategoryInput
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from("expense_categories")
    .update({
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      color: payload.color,
      is_default: payload.is_default, // <-- update is_default in DB
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id)
    .select()
    .single();

  if (error || !data) {
    console.error("Update category error:", error?.message);
    throw new Error(error?.message || "Failed to update category");
  }

  return data as ExpenseCategory;
}