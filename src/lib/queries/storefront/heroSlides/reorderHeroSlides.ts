"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

/** `orderedIds` is the full slide list in its new drag-and-drop order — each id's index becomes its new sort_order. */
export async function reorderHeroSlides(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  // Only reorder rows that actually belong to this store — silently ignores
  // any id in the list that doesn't (defends against a tampered id list
  // rather than trusting the array's contents wholesale).
  const { data: owned } = await supabaseAdmin
    .from("store_hero_slides")
    .select("id")
    .eq("store_id", storeId)
    .in("id", orderedIds);

  const ownedIds = new Set((owned ?? []).map((row) => row.id as string));

  const updates = orderedIds
    .filter((id) => ownedIds.has(id))
    .map((id, index) =>
      supabaseAdmin
        .from("store_hero_slides")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("store_id", storeId),
    );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  return { success: true };
}
