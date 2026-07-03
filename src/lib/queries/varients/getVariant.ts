"use server";
import { createClient } from "@/lib/supabase/server";

export async function getVariants(productId: string) {
  const supabase = createClient();
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
