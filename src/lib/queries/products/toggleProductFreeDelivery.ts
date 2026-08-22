"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function toggleProductFreeDelivery(
  productId: string,
  freeDelivery: boolean,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("products")
    .update({ free_delivery: freeDelivery })
    .eq("id", productId);

  if (error) throw error;
}
