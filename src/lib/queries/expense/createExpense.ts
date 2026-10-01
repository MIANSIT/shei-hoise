"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { Expense } from "@/lib/types/expense/type";
import { authorizeForStore, checkExpenseLimit, logActivity } from "@/lib/permissions/server";

export interface CreateExpenseInput {
  store_id: string;
  category_id?: string; // optional — omit entirely if not selected (NOT NULL constraint)
  amount: number;
  title: string;
  description?: string;
  expense_date: string; // ISO date string e.g. "2026-02-25"
  vendor_name?: string;
  payment_method?: string;
  platform?: string;
  notes?: string;
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<Expense | null> {
  try {
    const auth = await authorizeForStore(input.store_id, "expenses.add");
    if (!auth.ok) {
      console.error("createExpense:", auth.error);
      return null;
    }
    const overLimit = checkExpenseLimit(auth.actor, Number(input.amount) || 0);
    if (overLimit) {
      console.error("createExpense:", overLimit);
      return null;
    }

    // Strip keys with undefined values to avoid sending null for NOT NULL columns
    const sanitized = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined && v !== null),
    );

    const { data, error } = await supabase
      .from("expenses")
      .insert([sanitized])
      .select(
        `
        *,
        category:expense_categories(*)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating expense:", error.message);
      return null;
    }

    await logActivity(auth.actor, {
      action: "expenses.add",
      entityType: "expense",
      entityId: data.id,
      summary: `${input.title}: ৳${input.amount} (${input.expense_date})`,
    });

    return data as Expense;
  } catch (err) {
    console.error("Exception in createExpense:", err);
    return null;
  }
}
