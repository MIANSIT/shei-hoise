"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeProduct } from "@/lib/permissions/server";

export async function toggleProductFreeDelivery(
  productId: string,
  freeDelivery: boolean,
): Promise<void> {
  const auth = await authorizeProduct(productId, ["products.edit"]);
  if (!auth.ok) throw new Error(auth.error);

  const { error } = await supabaseAdmin
    .from("products")
    .update({ free_delivery: freeDelivery })
    .eq("id", productId);

  if (error) throw error;
}
