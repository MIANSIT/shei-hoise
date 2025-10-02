import type { Product } from "@/lib/queries/products/getProducts";
import type { ProductType } from "@/lib/schema/productSchema";

export function mapProductToFormType(
  product: Product,
  storeId: string
): ProductType {
  return {
    store_id: storeId,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    short_description: product.short_description || "",
    base_price: product.base_price,
    tp_price: product.tp_price ?? 0,
    sku: product.sku || "",
    stock: product.stock?.quantity_available || 0,
    status: product.status || "active",
    featured: Boolean(product.featured), // ✅ convert to boolean
    category_id: product.category?.id,
    discounted_price: product.discounted_price ?? undefined,
    discount_amount: product.discount_amount ?? undefined,
    weight: product.weight ?? undefined,

    images: product.images.map((img) => ({
      imageUrl: img.image_url,
      altText: img.alt_text ?? undefined,
      isPrimary: img.is_primary,
    })),

    variants: product.variants.map((v) => ({
      variant_name: v.variant_name,
      sku: v.sku || "",
      price: v.price,
      attributes: v.attributes || {},
      weight: v.weight ?? undefined,
      color: v.color || "",
      is_active: v.is_active ?? true,
      stock: v.stock.quantity_available,
    })),
  };
}
