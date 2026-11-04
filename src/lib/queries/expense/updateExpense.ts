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
import { resolveFunder } from "@/lib/queries/financial/resolveFunder";

export interface UpdateExpenseInput {
  id: string;
  category_id?: string;
  amount?: number;
  title?: string;
  description?: string;
  expense_date?: string;
  vendor_name?: string;
  payment_method?: string;
  paid_from?: "shop" | "outside";
  /** Sent only to change who paid; null clears it. */
  funder_id?: string | null;
  funder_treatment?: "capital" | "loan" | null;
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
      .select("branch_id, paid_from, amount")
      .eq("id", id)
      .eq("store_id", storeResult.storeId)
      .maybeSingle();
    if (current?.branch_id && !canUseBranch(storeResult.actor, current.branch_id)) {
      console.error("updateExpense:", BRANCH_SCOPE_ERROR);
      return null;
    }

    // Strip undefined values so we never accidentally null out existing DB columns
    const fields: Record<string, unknown> = Object.fromEntries(
      Object.entries(rawFields).filter(([, v]) => v !== undefined),
    );

    // Who paid: only touched when the form sent it, and only counts for money from outside the shop.
    if ("funder_id" in fields || "funder_treatment" in fields) {
      const funder = await resolveFunder(
        storeResult.storeId,
        rawFields.paid_from ?? current?.paid_from ?? null,
        rawFields.funder_id,
        rawFields.funder_treatment,
        { amount: Number(rawFields.amount ?? current?.amount ?? 0) || 0, excludeExpenseId: id },
      );
      if (!funder.ok) {
        console.error("updateExpense:", funder.error);
        return null;
      }
      fields.funder_id = funder.funderId;
      fields.funder_treatment = funder.treatment;
    }

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
