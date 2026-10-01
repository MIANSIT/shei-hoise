"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

export async function toggleProductFeatured(
  productId: string,
  featured: boolean,
): Promise<void> {
  const storeResult = await getAuthorizedStoreId("products.edit");
  if (!storeResult.ok) throw new Error(storeResult.error);

  const { error } = await supabaseAdmin
    .from("products")
    .update({ featured })
    .eq("id", productId)
    .eq("store_id", storeResult.storeId);

  if (error) throw error;
}
