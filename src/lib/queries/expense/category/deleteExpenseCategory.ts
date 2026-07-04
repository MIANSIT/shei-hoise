// /lib/queries/expense/deleteCategory.ts

"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

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