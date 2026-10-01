"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { ProductVariantType } from "@/lib/schema/varientSchema";
import { authorizeProduct } from "@/lib/permissions/server";
export async function createVariant(variant: ProductVariantType) {
  try {
    const auth = await authorizeProduct(variant.product_id, ["products.add", "products.edit"]);
    if (!auth.ok) throw new Error(auth.error);

    const { data, error } = await supabase
      .from("product_variants")
      .insert([variant])
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("createVariant error:", err);
    throw err;
  }
}
