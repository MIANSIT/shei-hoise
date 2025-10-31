// File: lib/queries/products/getProductById.ts
import { supabaseAdmin } from "@/lib/supabase";

import type {
  Product,
  ProductVariant,
  ProductStock,
  ProductImage,
  Category,
} from "./getProducts";

/* ---------- Raw DB Types ---------- */
interface DbVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku?: string | null;
  base_price: number;
  discounted_price?: number | null;
  discount_amount?: number | null;
  tp_price?: number | null;
  attributes?: Record<string, string | number | boolean> | null;
  weight?: number | null;
  color?: string | null;
  is_active?: boolean;
  product_inventory: ProductStock[] | null;
}

interface DbProduct {
  status: "draft" | "active" | "inactive" | "archived";
  featured: boolean | string;
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  tp_price?: number | null;
  description?: string | null;
  short_description?: string | null;
  base_price: number;
  discounted_price: number | null;
  discount_amount: number | null;
  weight?: number | null;
  category_id: string | null;
  created_at: string;
  categories: Category[] | null;
  product_inventory: ProductStock[] | null;
  product_images: ProductImage[] | null;
  product_variants: DbVariant[] | null;
}

/* ---------- Helpers ---------- */
function calculateLowStock(stock?: ProductStock | null): boolean {
  if (!stock || !stock.track_inventory) return false;
  const threshold = stock.low_stock_threshold ?? 0;
  return stock.quantity_available <= threshold;
}

function mapVariant(v: DbVariant, allImages: ProductImage[]): ProductVariant {
  const variantImages = allImages.filter((img) => img.variant_id === v.id);

  const stock = v.product_inventory?.[0] || {
    quantity_available: 0,
    quantity_reserved: 0,
    low_stock_threshold: 0,
    track_inventory: false,
  };

  return {
    id: v.id,
    product_id: v.product_id,
    variant_name: v.variant_name,
    sku: v.sku || "",
    price: Number(v.base_price),
    attributes: v.attributes || {},
    weight: v.weight ?? null,
    color: v.color ?? null,
    is_active: v.is_active ?? true,
    stock,
    images: variantImages,
    is_low_stock: calculateLowStock(stock),
  };
}

/* ---------- Main Function ---------- */
export async function getProductById(
  storeId: string,
  productId: string
): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      sku,
      tp_price,
      description,
      short_description,
      base_price,
      discounted_price,
      discount_amount,
      weight,
      category_id,
      created_at,
      categories!inner(id, name),
      product_inventory(quantity_available, quantity_reserved, low_stock_threshold, track_inventory),
      product_images(id, product_id, variant_id, image_url, alt_text, sort_order, is_primary, created_at),
      product_variants(
        id,
        product_id,
        variant_name,
        sku,
        base_price,
        discounted_price,
        discount_amount,
        tp_price,
        attributes,
        weight,
        color,
        is_active,
        product_inventory(quantity_available, quantity_reserved, low_stock_threshold, track_inventory)
      )
    `
    )
    .eq("store_id", storeId)
    .eq("id", productId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const p = data as DbProduct;

  const productStock = p.product_inventory?.[0] || {
    quantity_available: 0,
    quantity_reserved: 0,
    low_stock_threshold: 0,
    track_inventory: false,
  };

  const isProductLowStock = calculateLowStock(productStock);

  const variants = (p.product_variants ?? []).map((v) =>
    mapVariant(v, p.product_images ?? [])
  );

  return {
    id: p.id,
    sku: p.sku || "",
    tp_price: p.tp_price ?? 0,
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    short_description: p.short_description ?? "",
    base_price: Number(p.base_price),
    discounted_price: p.discounted_price ? Number(p.discounted_price) : null,
    discount_amount: p.discount_amount ? Number(p.discount_amount) : null,
    weight: p.weight ?? null,
    status: p.status,
    featured: p.featured === true || p.featured === "true",
    category:
      p.categories && p.categories.length > 0
        ? { id: p.categories[0].id, name: p.categories[0].name }
        : null,
    stock: productStock,
    is_low_stock: isProductLowStock,
    images: (p.product_images ?? []).filter((img) => img.variant_id === null),
    variants,
  };
}
