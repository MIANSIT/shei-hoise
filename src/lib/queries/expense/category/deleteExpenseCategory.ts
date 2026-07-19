// /lib/queries/expense/deleteCategory.ts

"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function deleteCategory(id: string): Promise<void> {
  const { data: category, error: fetchError } = await supabase
    .from("expense_categories")
    .select("is_default")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Delete category error:", fetchError.message);
    throw new Error(fetchError.message);
  }
  if (category?.is_default) {
    throw new Error("Default categories can't be deleted");
  }

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete category error:", error.message);
    throw new Error(error.message);
  }
}