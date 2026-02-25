// /lib/queries/expense/deleteCategory.ts

import { supabase } from "@/lib/supabase";

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete category error:", error.message);
    throw new Error(error.message);
  }
}