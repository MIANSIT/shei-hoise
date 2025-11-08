import { supabase } from "@/lib/supabase";

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order?: number;
}

export async function getProductImages(productIds: string[]): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .in("product_id", productIds);

  if (error) throw error;

  return data ?? [];
}
