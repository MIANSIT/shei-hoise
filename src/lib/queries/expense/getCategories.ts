import { supabase } from "@/lib/supabase";
import { ExpenseCategory } from "@/lib/types/expense/expense";

export async function getCategories(
  storeId: string
): Promise<ExpenseCategory[]> {
  if (!storeId) return [];

  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .or(`store_id.eq.${storeId},is_default.eq.true`) // ✅ store match OR default
    .order("is_default", { ascending: false })      // default first
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as ExpenseCategory[];
}