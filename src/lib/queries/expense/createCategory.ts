// /lib/queries/expense/createCategory.ts

import { supabase } from "@/lib/supabase";
import { ExpenseCategory, CreateCategoryInput } from "@/lib/types/expense/expense";

export async function createCategory(
  payload: CreateCategoryInput
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({
      ...payload,
      is_default: payload.is_default ?? false, // default to false if not set
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Create category error:", error?.message);
    throw new Error(error?.message || "Failed to create category");
  }

  return data as ExpenseCategory;
}