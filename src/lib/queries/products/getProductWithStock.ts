// src/lib/queries/product/getProductWithStock.ts
import { supabaseAdmin } from "@/lib/supabase";

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
}

export interface ProductStock {
  quantity_available: number;
  quantity_reserved: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  price: number;
  color?: string | null;
  stock: ProductStock;
  primary_image: ProductImage | null; // only primary image
}

export interface ProductWithStock {
  id: string;
  name: string;
  base_price: number;
  primary_image: ProductImage | null; // only primary image
  stock: ProductStock | null;
  variants: ProductVariant[];
}

// Supabase response types
interface SupabaseProductVariantRow {
  id: string;
  variant_name: string;
  price: string;
  color: string | null;
  product_inventory: ProductStock[];
  product_images: ProductImage[];
}

interface SupabaseProductRow {
  id: string;
  name: string;
  base_price: string;
  product_images: ProductImage[];
  product_inventory: ProductStock[];
  product_variants: SupabaseProductVariantRow[];
}

export async function getProductWithStock(): Promise<ProductWithStock[]> {
  const { data, error } = await supabaseAdmin.from<
    "products",
    SupabaseProductRow
  >("products").select(`
      id,
      name,
      base_price,
      product_images(id, product_id, variant_id, image_url, alt_text, is_primary),
      product_inventory(quantity_available, quantity_reserved),
      product_variants(
        id,
        variant_name,
        price,
        color,
        product_inventory(quantity_available, quantity_reserved),
        product_images(id, product_id, variant_id, image_url, alt_text, is_primary)
      )
    `);

  if (error) throw new Error(error.message);

  return (data || []).map((p: SupabaseProductRow): ProductWithStock => {
    const primaryProductImage =
      p.product_images?.find((img) => img.is_primary) || null;

    return {
      id: p.id,
      name: p.name,
      base_price: Number(p.base_price),
      primary_image: primaryProductImage,
      stock: p.product_inventory?.[0] || null,
      variants: (p.product_variants || []).map((v): ProductVariant => {
        const primaryVariantImage =
          v.product_images?.find((img) => img.is_primary) || null;

        return {
          id: v.id,
          product_id: p.id,
          variant_name: v.variant_name,
          price: Number(v.price),
          color: v.color || null,
          stock: v.product_inventory?.[0] || {
            quantity_available: 0,
            quantity_reserved: 0,
          },
          primary_image: primaryVariantImage,
        };
      }),
    };
  });
}
