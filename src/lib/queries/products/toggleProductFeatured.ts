"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export async function toggleProductFeatured(
  productId: string,
  featured: boolean,
): Promise<void> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { error } = await supabaseAdmin
    .from("products")
    .update({ featured })
    .eq("id", productId)
    .eq("store_id", storeResult.storeId);

  if (error) throw error;
}
