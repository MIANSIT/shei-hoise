"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { Expense } from "@/lib/types/expense/type";
import {
  BRANCH_SCOPE_ERROR,
  canUseBranch,
  checkExpenseLimit,
  getAuthorizedStoreId,
  logActivity,
} from "@/lib/permissions/server";

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
  branch_id?: string;
}

export async function updateExpense(
  input: UpdateExpenseInput,
): Promise<Expense | null> {
  try {
    const { id, ...rawFields } = input;

    // id is caller-supplied — scope the update to an expense that actually
    // belongs to the caller's own store.
    const storeResult = await getAuthorizedStoreId("expenses.edit");
    if (!storeResult.ok) {
      console.error("updateExpense: unauthorized store access attempt");
      return null;
    }

    if (rawFields.amount !== undefined) {
      const overLimit = checkExpenseLimit(storeResult.actor, Number(rawFields.amount) || 0);
      if (overLimit) {
        console.error("updateExpense:", overLimit);
        return null;
      }
    }

    // Staff limited to some branches can only touch (and move to) their own.
    if (rawFields.branch_id && !canUseBranch(storeResult.actor, rawFields.branch_id)) {
      console.error("updateExpense:", BRANCH_SCOPE_ERROR);
      return null;
    }
    const { data: current } = await supabase
      .from("expenses")
      .select("branch_id")
      .eq("id", id)
      .eq("store_id", storeResult.storeId)
      .maybeSingle();
    if (current?.branch_id && !canUseBranch(storeResult.actor, current.branch_id)) {
      console.error("updateExpense:", BRANCH_SCOPE_ERROR);
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

    await logActivity(storeResult.actor, {
      action: "expenses.edit",
      entityType: "expense",
      entityId: id,
      summary: `${data.title}: ৳${data.amount}`,
      details: { changed: fields },
    });

    return data as Expense;
  } catch (err) {
    console.error("Exception in updateExpense:", err);
    return null;
  }
}
