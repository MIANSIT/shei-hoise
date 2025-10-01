// src/lib/queries/products/getProducts.ts
import { supabaseAdmin } from "@/lib/supabase";

/* ---------- Shared Interfaces ---------- */
export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface ProductStock {
  quantity_available: number;
  quantity_reserved: number;
}

export interface Category {
  id: string;
  name: string;
}

/* ---------- Final App Models ---------- */
export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku?: string | null;
  price: number;
  weight?: number | null;
  color?: string | null;
  is_active?: boolean;
  stock: ProductStock;
  images: ProductImage[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  discounted_price: number | null;
  category: Category | null;
  stock: ProductStock | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

/* ---------- Raw DB Types (from Supabase query) ---------- */
interface DbVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku?: string | null;
  price: number;
  weight?: number | null;
  color?: string | null;
  is_active?: boolean;
  product_inventory: ProductStock[] | null;
}

interface DbProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  discounted_price: number | null;
  category_id: string | null;
  created_at: string;
  categories: Category[] | null; // Supabase returns array even if !inner
  product_inventory: ProductStock[] | null;
  product_images: ProductImage[] | null;
  product_variants: DbVariant[] | null;
}

/* ---------- Main Query Function ---------- */
export async function getProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      base_price,
      discounted_price,
      category_id,
      created_at,
      categories!inner(id, name),
      product_inventory(quantity_available, quantity_reserved),
      product_images(id, product_id, variant_id, image_url, alt_text, sort_order, is_primary, created_at),
      product_variants(
        id,
        product_id,
        variant_name,
        sku,
        price,
        weight,
        color,
        is_active,
        product_inventory(quantity_available, quantity_reserved)
      )
    `
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const products = (data ?? []) as DbProduct[];

  return products.map((p): Product => {
    // 🔹 separate product-level images
    const productImages = (p.product_images ?? []).filter(
      (img) => img.variant_id === null
    );

    // 🔹 get the first category if exists
    const category =
      p.categories && p.categories.length > 0
        ? { id: p.categories[0].id, name: p.categories[0].name }
        : null;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      base_price: Number(p.base_price),
      discounted_price: p.discounted_price ? Number(p.discounted_price) : null,
      category,
      stock: p.product_inventory?.[0] || null,
      images: productImages,
      variants: (p.product_variants ?? []).map((v): ProductVariant => {
        // 🔹 separate variant images
        const variantImages = (p.product_images ?? []).filter(
          (img) => img.variant_id === v.id
        );

        return {
          id: v.id,
          product_id: p.id,
          variant_name: v.variant_name,
          sku: v.sku || null,
          price: Number(v.price),
          weight: v.weight || null,
          color: v.color || null,
          is_active: v.is_active ?? true,
          stock: v.product_inventory?.[0] || {
            quantity_available: 0,
            quantity_reserved: 0,
          },
          images: variantImages,
        };
      }),
    };
  });
}
