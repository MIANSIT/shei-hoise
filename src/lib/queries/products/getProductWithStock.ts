// src/lib/queries/products/getProductWithStock.ts
import { supabaseAdmin } from "@/lib/supabase";

export type ProductImage = {
  id: string;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  variant_id?: string | null;
};

export type ProductVariant = {
  id: string;
  variant_name: string;
  price: number;
  stock: number;
  images: ProductImage[];
};

export type ProductWithStock = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  tp_price: number | null;
  discounted_price: number | null;
  stock: number; // main product stock if no variants
  images: ProductImage[];
  variants?: ProductVariant[];
};

// Supabase response types
type ProductInventory = {
  quantity_available: number;
};

type ProductVariantWithInventory = {
  id: string;
  variant_name: string;
  price: number;
  product_inventory?: ProductInventory[];
  product_images?: ProductImage[];
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  tp_price: number | null;
  discounted_price: number | null;
  product_inventory?: ProductInventory[];
  product_images?: ProductImage[];
  product_variants?: ProductVariantWithInventory[];
};

export async function getProductWithStock(productId: string) {
  if (!productId) throw new Error("Product ID is required");

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      slug,
      base_price,
      tp_price,
      discounted_price,
      product_inventory(quantity_available),
      product_images (
        id,
        variant_id,
        image_url,
        alt_text,
        sort_order,
        is_primary
      ),
      product_variants (
        id,
        variant_name,
        price,
        product_inventory(quantity_available),
        product_images (
          id,
          variant_id,
          image_url,
          alt_text,
          sort_order,
          is_primary
        )
      )
    `)
    .eq("id", productId)
    .single<ProductData>();

  if (error) throw error;
  if (!data) return null;

  // Main product images (exclude variant images)
  const images: ProductImage[] = (data.product_images ?? [])
    .filter(img => !img.variant_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Variants
  const variants: ProductVariant[] | undefined =
    data.product_variants && data.product_variants.length > 0
      ? data.product_variants.map(v => ({
          id: v.id,
          variant_name: v.variant_name,
          price: v.price,
          stock: v.product_inventory?.[0]?.quantity_available ?? 0,
          images: (v.product_images ?? []).sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        }))
      : undefined;

  // Stock for main product if no variants
  const stock =
    variants && variants.length > 0
      ? 0
      : data.product_inventory?.[0]?.quantity_available ?? 0;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    base_price: data.base_price,
    tp_price: data.tp_price,
    discounted_price: data.discounted_price,
    stock,
    images,
    variants,
  } as ProductWithStock;
}
