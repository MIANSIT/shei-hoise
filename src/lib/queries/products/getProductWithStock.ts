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
  low_stock_threshold: number;
  track_inventory: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  base_price: number;
  discounted_price?: number | null;
  tp_price?: number | null;
  color?: string | null;
  stock: ProductStock;
  primary_image: ProductImage | null;
}

export interface ProductWithStock {
  id: string;
  name: string;
  base_price: number;
  primary_image: ProductImage | null;
  stock: ProductStock | null;
  variants: ProductVariant[];
}

// Supabase response types
interface DatabaseProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
}

interface DatabaseProductStock {
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  track_inventory: boolean;
}

interface DatabaseProductVariant {
  id: string;
  variant_name: string;
  base_price: number;
  discounted_price: number | null;
  tp_price: number | null;
  color: string | null;
  product_inventory: DatabaseProductStock[];
  product_images: DatabaseProductImage[];
}

interface DatabaseProduct {
  id: string;
  name: string;
  base_price: number;
  product_images: DatabaseProductImage[];
  product_inventory: DatabaseProductStock[];
  product_variants: DatabaseProductVariant[];
  stores: Array<{
    id: string;
    store_slug: string;
  }>;
}

export async function getProductWithStock(
  storeSlug: string
): Promise<ProductWithStock[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      base_price,
      product_images(id, product_id, variant_id, image_url, alt_text, is_primary),
      product_inventory(
        quantity_available, 
        quantity_reserved, 
        low_stock_threshold, 
        track_inventory
      ),
      product_variants(
        id,
        variant_name,
        base_price,
        discounted_price,
        tp_price,
        color,
        product_inventory(
          quantity_available, 
          quantity_reserved, 
          low_stock_threshold, 
          track_inventory
        ),
        product_images(id, product_id, variant_id, image_url, alt_text, is_primary)
      ),
      stores!inner(id, store_slug)
    `
    )
    .eq("stores.store_slug", storeSlug);

  if (error) {
    throw new Error(
      `Error fetching products for store ${storeSlug}: ${error.message}`
    );
  }

  if (!data) {
    return [];
  }

  return data.map((p: DatabaseProduct) => {
    const primaryProductImage =
      p.product_images?.find((img) => img.is_primary) || null;

    // Get product inventory with low_stock_threshold
    const productInventory = p.product_inventory?.[0];
    const lowStockThreshold = productInventory?.low_stock_threshold
      ? Number(productInventory.low_stock_threshold)
      : 10;

    return {
      id: p.id,
      name: p.name,
      base_price: Number(p.base_price),
      primary_image: primaryProductImage,
      stock: productInventory || null,
      variants: p.product_variants.map((v) => {
        const variantInventory = v.product_inventory?.[0];
        return {
          id: v.id,
          product_id: p.id,
          variant_name: v.variant_name,
          base_price: v.base_price,
          discounted_price: v.discounted_price,
          tp_price: v.tp_price,
          color: v.color || null,
          stock: variantInventory || {
            quantity_available: 0,
            quantity_reserved: 0,
            low_stock_threshold: lowStockThreshold,
            track_inventory: true,
          },
          primary_image:
            v.product_images?.find((img) => img.is_primary) || null,
        };
      }),
    };
  });
}
