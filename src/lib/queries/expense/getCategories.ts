// /lib/queries/expense/getCategories.ts

import { supabase } from "@/lib/supabase";
import { ExpenseCategory } from "@/lib/types/expense/expense";

export async function getCategories(
  storeId: string
): Promise<ExpenseCategory[]> {
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error.message);
    throw new Error(error.message);
  }

  return data as ExpenseCategory[];
}