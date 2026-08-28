"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import {
  ExpenseCategory,
  CreateCategoryInput,
} from "@/lib/types/expense/type";

export async function createCategory(
  payload: CreateCategoryInput,
): Promise<ExpenseCategory> {
  // payload.store_id is caller-supplied — never trust it for authorization.
  // Always create under the session's own store, regardless of what was sent.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { data, error } = await supabase
    .from("expense_categories")
    .insert({
      ...payload,
      store_id: storeResult.storeId,
      is_active: payload.is_active ?? true, // ✅ default to active if not set
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Create category error:", error?.message);
    throw new Error(error?.message || "Failed to create category");
  }

  return data as ExpenseCategory;
}
