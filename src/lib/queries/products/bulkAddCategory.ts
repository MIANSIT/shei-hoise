"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

export type BulkCategoryMode = "add" | "replace";

export interface BulkCategoryOption {
  id: string;
  name: string;
}

export interface BulkAddCategoryResult {
  success: boolean;
  error?: string;
  /** Products that were put into the category. */
  updated: number;
  /** Products that were already in it. */
  alreadyIn: number;
}

/**
 * Active categories of the signed-in store, for the bulk "Add category" picker.
 * @returns the categories, or an empty list on failure
 */
export async function listBulkCategoryOptions(): Promise<BulkCategoryOption[]> {
  const storeResult = await getAuthorizedStoreId("products.edit");
  if (!storeResult.ok) return [];
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("store_id", storeResult.storeId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []) as BulkCategoryOption[];
}

/**
 * Adds one category to every chosen product. Their existing categories (and
 * main category) are kept; a product already in it is left alone.
 */
export async function bulkAddCategory(input: {
  productIds: string[];
  categoryId: string;
  /** "add" keeps the current categories; "replace" makes this the only (main) category. */
  mode?: BulkCategoryMode;
}): Promise<BulkAddCategoryResult> {
  const storeResult = await getAuthorizedStoreId("products.edit");
  if (!storeResult.ok) return { success: false, error: storeResult.error, updated: 0, alreadyIn: 0 };

  const { productIds, categoryId } = input;
  const mode: BulkCategoryMode = input.mode ?? "add";
  if (productIds.length === 0) {
    return { success: false, error: "Select at least one product.", updated: 0, alreadyIn: 0 };
  }
  if (!categoryId) {
    return { success: false, error: "Choose a category.", updated: 0, alreadyIn: 0 };
  }

  try {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("store_id", storeResult.storeId)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return { success: false, error: "Category not found.", updated: 0, alreadyIn: 0 };

    const { data: products, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("id, category_id, category_ids")
      .eq("store_id", storeResult.storeId)
      .in("id", productIds);
    if (fetchError) throw fetchError;

    let updated = 0;
    let alreadyIn = 0;

    for (const product of products ?? []) {
      const current: string[] =
        product.category_ids && product.category_ids.length > 0
          ? product.category_ids
          : product.category_id
            ? [product.category_id]
            : [];
      const alreadyOnly = current.length === 1 && current[0] === categoryId;
      if (mode === "add" ? current.includes(categoryId) : alreadyOnly) {
        alreadyIn++;
        continue;
      }
      // A database trigger keeps category_id as the first of this list.
      const { error } = await supabaseAdmin
        .from("products")
        .update({ category_ids: mode === "replace" ? [categoryId] : [...current, categoryId] })
        .eq("id", product.id)
        .eq("store_id", storeResult.storeId);
      if (error) throw error;
      updated++;
    }

    return { success: true, updated, alreadyIn };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not add the category.",
      updated: 0,
      alreadyIn: 0,
    };
  }
}
