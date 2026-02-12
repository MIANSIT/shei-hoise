import { supabase } from "@/lib/supabase";
import { ExpenseCategory } from "@/lib/types/expense/expense";

export async function getCategories(
  storeId: string,
): Promise<ExpenseCategory[] | null> {
  try {
    if (!storeId) return [];

    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories for store:", error);
      return null;
    }

    return data as ExpenseCategory[];
  } catch (err) {
    console.error("Exception in getCategoriesByStore:", err);
    return null;
  }
}
