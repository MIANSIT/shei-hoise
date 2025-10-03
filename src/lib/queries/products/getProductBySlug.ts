// lib/queries/products/getProductTypeBySlug.ts
import { supabaseAdmin } from "@/lib/supabase";
import type { ProductType } from "@/lib/schema/productSchema";
import type { ProductStock, ProductImage, Category } from "./getProducts";

// DB variant type
interface DbVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku?: string | null;
  price: number;
  attributes?: Record<string, string | number | boolean> | null;
  weight?: number | null;
  color?: string | null;
  is_active?: boolean | null;
  product_inventory: ProductStock[] | null;
}

// DB product type
interface DbProduct {
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
  featured: boolean | string;
  status: "draft" | "active" | "inactive" | "archived";
  category_id?: string | null;
  created_at: string;
  categories?: Category | Category[] | null;
  product_inventory: ProductStock[] | null;
  product_images: ProductImage[] | null;
  product_variants: DbVariant[] | null;
}

// Map variant to ProductType-compatible shape
function mapVariant(v: DbVariant, allImages: ProductImage[] = []) {
  const images = allImages.filter((img) => img.variant_id === v.id);
  return {
    variant_name: v.variant_name,
    sku: v.sku || "",
    price: Number(v.price),
    attributes: v.attributes || {},
    weight: v.weight ?? undefined,
    color: v.color || "",
    is_active: v.is_active ?? true,
    stock: v.product_inventory?.[0]?.quantity_available || 0,
    images,
  };
}

// Main function: fetch and return ProductType directly
export async function getProductBySlug(
  storeId: string,
  slug: string
): Promise<ProductType | null> {
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
      featured,
      status,
      category_id,
      categories(id,name),
      product_inventory(quantity_available, quantity_reserved),
      product_images(id, product_id, variant_id, image_url, alt_text, sort_order, is_primary, created_at),
      product_variants(
        id,
        product_id,
        variant_name,
        sku,
        price,
        attributes,
        weight,
        color,
        is_active,
        product_inventory(quantity_available, quantity_reserved)
      )
    `
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const p = data as DbProduct;

  const category =
    Array.isArray(p.categories) && p.categories.length > 0
      ? { id: p.categories[0].id, name: p.categories[0].name }
      : p.categories && "id" in p.categories
      ? { id: p.categories.id, name: p.categories.name }
      : undefined;

  const productImages = (p.product_images ?? []).filter(
    (img) => img.variant_id === null
  );

  return {
    store_id: storeId,
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    short_description: p.short_description ?? "",
    base_price: Number(p.base_price),
    tp_price: p.tp_price ?? 0,
    sku: p.sku || "",
    stock: p.product_inventory?.[0]?.quantity_available || 0,
    status: p.status,
    featured: p.featured === true || p.featured === "true",
    category_id: category?.id,
    discounted_price: p.discounted_price ?? undefined,
    discount_amount: p.discount_amount ?? undefined,
    weight: p.weight ?? undefined,

    images: productImages.map((img) => ({
      imageUrl: img.image_url,
      altText: img.alt_text ?? undefined,
      isPrimary: img.is_primary,
    })),

    variants: (p.product_variants ?? []).map((v) =>
      mapVariant(v, p.product_images ?? [])
    ),
  };
}
