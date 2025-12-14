import { supabaseAdmin } from "@/lib/supabase";
import { StockFilter } from "@/lib/types/enums";

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
  sku: string | null;
  color?: string | null;
  stock: ProductStock;
  primary_image: ProductImage | null;
}

export interface ProductWithStock {
  sku: string | null;
  id: string;
  name: string;
  base_price: number;
  primary_image: ProductImage | null;
  stock: ProductStock | null;
  variants: ProductVariant[];
}

// Database response types
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
  sku: string | null;
}

interface DatabaseProduct {
  id: string;
  name: string;
  base_price: number;
  sku: string | null;
  product_images: DatabaseProductImage[];
  product_inventory: DatabaseProductStock[];
  product_variants: DatabaseProductVariant[];
  stores: Array<{ id: string; store_slug: string }>;
}

/**
 * Fetch products with optional search, stock filter, and pagination
 */
export async function getProductWithStock(
  storeSlug: string,
  searchText?: string,
  stockFilter: StockFilter = StockFilter.ALL,
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: ProductWithStock[]; total: number }> {
  let query = supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      base_price,
      sku,
      product_images(id, product_id, variant_id, image_url, alt_text, is_primary),
      product_inventory(quantity_available, quantity_reserved, low_stock_threshold, track_inventory),
      product_variants(
        id,
        variant_name,
        base_price,
        sku,
        discounted_price,
        tp_price,
        color,
        product_inventory(quantity_available, quantity_reserved, low_stock_threshold, track_inventory),
        product_images(id, product_id, variant_id, image_url, alt_text, is_primary)
      ),
      stores!inner(id, store_slug)
    `,
      { count: "exact" }
    )
    .eq("stores.store_slug", storeSlug)
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (searchText) {
    const pattern = `%${searchText}%`;
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  }

  const { data, count, error } = await query;

  if (error) throw new Error(`Error fetching products: ${error.message}`);
  if (!data) return { data: [], total: 0 };

  const mapped = data.map((p: DatabaseProduct) => {
    const primaryProductImage =
      p.product_images?.find((img) => img.is_primary) || null;
    const productInventory = p.product_inventory?.[0] || null;
    const lowStockThreshold = productInventory?.low_stock_threshold ?? 10;

    const variants = p.product_variants.map((v) => {
      const variantInventory = v.product_inventory?.[0];
      return {
        id: v.id,
        product_id: p.id,
        variant_name: v.variant_name,
        base_price: v.base_price,
        discounted_price: v.discounted_price,
        tp_price: v.tp_price,
        color: v.color || null,
        sku: v.sku ?? null,
        stock: variantInventory || {
          quantity_available: 0,
          quantity_reserved: 0,
          low_stock_threshold: lowStockThreshold,
          track_inventory: true,
        },
        primary_image: v.product_images?.find((img) => img.is_primary) || null,
      };
    });

    return {
      id: p.id,
      name: p.name,
      base_price: Number(p.base_price),
      sku: p.sku ?? null,
      primary_image: primaryProductImage,
      stock: productInventory,
      variants,
    };
  });

  // Apply stock filter
  const filtered = mapped.filter((product) => {
    const productStockAvailable = product.stock?.quantity_available ?? 0;
    const productLowStockThreshold = product.stock?.low_stock_threshold ?? 10;

    const variantStockAvailable = product.variants.map(
      (v) => v.stock.quantity_available
    );

    switch (stockFilter) {
      case StockFilter.ALL:
        return true;
      case StockFilter.LOW:
        return (
          productStockAvailable <= productLowStockThreshold ||
          variantStockAvailable.some((q) => q <= productLowStockThreshold)
        );
      case StockFilter.IN:
        return (
          productStockAvailable > productLowStockThreshold ||
          variantStockAvailable.some((q) => q > productLowStockThreshold)
        );
      case StockFilter.OUT:
        return (
          productStockAvailable === 0 ||
          variantStockAvailable.some((q) => q === 0)
        );
      default:
        return true;
    }
  });

  return { data: filtered, total: count ?? filtered.length };
}
