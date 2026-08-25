"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
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

    // id is caller-supplied — scope the update to an expense that actually
    // belongs to the caller's own store.
    const storeResult = await getAuthenticatedStoreId();
    if (!storeResult.ok) {
      console.error("updateExpense: unauthorized store access attempt");
      return null;
    }

    // Strip undefined values so we never accidentally null out existing DB columns
    const fields = Object.fromEntries(
      Object.entries(rawFields).filter(([, v]) => v !== undefined),
    );

    const { data, error } = await supabase
      .from("expenses")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", storeResult.storeId)
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
