"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

/**
 * Persists a drag-and-drop reorder of the catalog.
 *
 * `orderedIds` is only the rows the owner can currently see — one page of a
 * possibly filtered list. Those ids are spliced back into the positions they
 * already occupy in the store's full ordering, so dragging inside a filtered
 * or paginated view never disturbs anything outside it.
 *
 * Bundles are rows in `products`, so the same call reorders them.
 */
export async function reorderProducts(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  if (orderedIds.length === 0) return { success: true };

  // The store's full catalog in its current effective order — the same
  // ordering every list applies: manual positions first, then newest.
  const { data: allRows, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (fetchError) return { success: false, error: fetchError.message };

  const fullOrder = (allRows ?? []).map((row) => row.id as string);

  // Ignore any id that isn't this store's — defends against a tampered list
  // rather than trusting what the browser posted.
  const owned = new Set(fullOrder);
  const moved = orderedIds.filter((id) => owned.has(id));
  if (moved.length === 0) return { success: true };

  // Write the dragged rows back into the slots they already held, in their
  // new relative order; every other row stays exactly where it was.
  const slots = fullOrder
    .map((id, index) => (moved.includes(id) ? index : -1))
    .filter((index) => index !== -1);

  const nextOrder = [...fullOrder];
  slots.forEach((slot, i) => {
    nextOrder[slot] = moved[i];
  });

  const { error } = await supabaseAdmin.rpc("reorder_products", {
    p_store_id: storeId,
    p_ordered_ids: nextOrder,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
