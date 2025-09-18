"use server";
import { supabase } from "@/lib/supabase";

export async function getVariants(productId: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("productId", productId);

  if (error) {
    console.error("Get variants error:", error);
    throw error;
  }

  return data;
}
