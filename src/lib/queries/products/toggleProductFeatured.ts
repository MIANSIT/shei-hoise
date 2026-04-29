import { supabaseAdmin } from "@/lib/supabase/admin";

export async function toggleProductFeatured(
  productId: string,
  featured: boolean,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("products")
    .update({ featured })
    .eq("id", productId);

  if (error) throw error;
}
