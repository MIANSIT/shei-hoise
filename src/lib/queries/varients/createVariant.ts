"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { ProductVariantType } from "@/lib/schema/varientSchema";
export async function createVariant(variant: ProductVariantType) {
  try {
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
