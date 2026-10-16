"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { BRANDS_NOT_IN_PLAN_ERROR, storeHasBrandsFeature } from "./brandAccess";

export type ReorderBrandsResult = { success: true } | { success: false; error: string };

/**
 * `orderedIds` is the full brand list in its new drag-and-drop order — each
 * id's index becomes its sort_order, which is the order shoppers see.
 */
export async function reorderBrands(orderedIds: string[]): Promise<ReorderBrandsResult> {
  try {
    const auth = await getAuthorizedStoreId("brands.edit");
    if (!auth.ok) return { success: false, error: auth.error };
    const storeId = auth.storeId;

    if (!(await storeHasBrandsFeature(storeId))) {
      return { success: false, error: BRANDS_NOT_IN_PLAN_ERROR };
    }

    // Ids come from the caller: only brands of this store are touched.
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from("brands")
      .select("id")
      .eq("store_id", storeId)
      .in("id", orderedIds);
    if (ownedError) return { success: false, error: ownedError.message };

    const ownedIds = new Set((owned ?? []).map((row) => row.id as string));
    const results = await Promise.all(
      orderedIds
        .filter((id) => ownedIds.has(id))
        .map((id, index) =>
          supabaseAdmin
            .from("brands")
            .update({ sort_order: index, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("store_id", storeId),
        ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return { success: false, error: failed.error.message };

    return { success: true };
  } catch (err) {
    console.error("reorderBrands failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to save the new order." };
  }
}
