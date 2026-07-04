"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import {
  ExpenseCategory,
  CreateCategoryInput,
} from "@/lib/types/expense/type";

export async function createCategory(
  payload: CreateCategoryInput,
): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({
      ...payload,
      is_active: payload.is_active ?? true, // ✅ default to active if not set
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
