import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types/expense/type";

export interface UpdateExpenseInput {
  id: string;
  category_id?: string;
  amount?: number;
  title?: string;
  description?: string;
  expense_date?: string;
  vendor_name?: string;
  payment_method?: string;
  platform?: string;
  notes?: string;
}

export async function updateExpense(
  input: UpdateExpenseInput,
): Promise<Expense | null> {
  try {
    const { id, ...rawFields } = input;

    // Strip undefined values so we never accidentally null out existing DB columns
    const fields = Object.fromEntries(
      Object.entries(rawFields).filter(([, v]) => v !== undefined),
    );

    const { data, error } = await supabase
      .from("expenses")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(
        `
        *,
        category:expense_categories(*)
      `,
      )
      .single();

    if (error) {
      console.error("Error updating expense:", error.message);
      return null;
    }

    return data as Expense;
  } catch (err) {
    console.error("Exception in updateExpense:", err);
    return null;
  }
}
