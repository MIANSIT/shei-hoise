import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types/expense/expense";

export async function getExpensesWithCategory(
  storeId: string
): Promise<Expense[] | null> {
  try {
    if (!storeId) return [];

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        category:expense_categories(*)
      `)
      .eq("store_id", storeId)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses for store:", error);
      return null;
    }

    return data as Expense[];
  } catch (err) {
    console.error("Exception in getExpensesWithCategoryByStore:", err);
    return null;
  }
}
