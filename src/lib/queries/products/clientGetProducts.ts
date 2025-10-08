/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types/product";

export async function clientGetProducts(store_slug: string): Promise<Product[]> {
  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id, store_slug")
    .eq("store_slug", store_slug)
    .single();

  if (storeError || !storeData) throw storeError || new Error("Store not found");

  const { data: products, error: productError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      base_price,
      discounted_price,
      categories(id, name),
      product_variants(
        id,
        variant_name,
        base_price,
        discounted_price,
        color,
        product_inventory(quantity_available, quantity_reserved),
        product_images(id, image_url, is_primary)
      ),
      product_images(id, image_url, is_primary)
    `)
    .eq("store_id", storeData.id);

  if (productError) throw productError;

  return (products ?? []).map((p: any) => {
    const primary_image = p.product_images?.find((img: any) => img.is_primary) || null;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      base_price: p.base_price,
      discounted_price: p.discounted_price,
      category: p.categories ? { id: p.categories.id, name: p.categories.name } : null,
      images: p.product_images?.map((img: any) => img.image_url) || [],
      primary_image,
      variants: (p.product_variants ?? []).map((v: any) => ({
        id: v.id,
        product_id: p.id,
        variant_name: v.variant_name,
        base_price: v.base_price,
        discounted_price: v.discounted_price,
        color: v.color,
        stock: v.product_inventory?.[0] || { quantity_available: 0, quantity_reserved: 0 },
        primary_image: v.product_images?.find((img: any) => img.is_primary) || null,
        product_images: v.product_images ?? [],
      })),
      stock: primary_image ? { quantity_available: 1, quantity_reserved: 0 } : null,
    } as Product;
  });
}
