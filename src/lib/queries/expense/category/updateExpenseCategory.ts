"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import {
  ExpenseCategory,
  UpdateCategoryInput,
} from "@/lib/types/expense/type";

export async function updateCategory(
  payload: UpdateCategoryInput,
): Promise<ExpenseCategory> {
  // payload.id is caller-supplied — scope the update to a category that
  // actually belongs to the caller's own store.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { data, error } = await supabase
    .from("expense_categories")
    .update({
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      color: payload.color,
      is_active: payload.is_active, // ✅ only update active status
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id)
    .eq("store_id", storeResult.storeId)
    .select()
    .single();

  if (error || !data) {
    console.error("Update category error:", error?.message);
    throw new Error(error?.message || "Failed to update category");
  }

  return data as ExpenseCategory;
}
