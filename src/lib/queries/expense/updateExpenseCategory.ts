import { supabase } from "@/lib/supabase";
import {
  ExpenseCategory,
  UpdateCategoryInput,
} from "@/lib/types/expense/type";

export async function updateCategory(
  payload: UpdateCategoryInput,
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from("expense_categories")
    .update({
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      color: payload.color,
      is_active: payload.is_active, // ✅ only update active status
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
