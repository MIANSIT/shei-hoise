import { ProductWithStock } from "@/lib/queries/products/getProductWithStock";

export interface VariantRow {
  id: string;
  productId: string; // ✅ added this
  title: string;
  currentPrice: number;
  stock: number;
  imageUrl: string | null;
}

export interface ProductRow {
  id: string;
  title: string;
  currentPrice: number | null; // null if variants exist
  stock: number;
  imageUrl: string | null;
  variants?: VariantRow[];
}

export function mapProductsForModernTable(
  products: ProductWithStock[]
): ProductRow[] {
  return products.map((p) => {
    const hasVariants = p.variants && p.variants.length > 0;

    return {
      id: p.id,
      title: p.name,
      currentPrice: hasVariants ? null : p.base_price,
      stock: p.stock?.quantity_available ?? 0,
      imageUrl: p.primary_image?.image_url ?? null,
      variants: hasVariants
        ? p.variants.map((v) => ({
            id: v.id,
            productId: v.product_id, // ✅ now works fine
            title: v.variant_name,
            currentPrice:
              v.discounted_price && v.discounted_price > 0
                ? v.discounted_price
                : v.base_price,
            stock: v.stock?.quantity_available ?? 0,
            imageUrl:
              v.primary_image?.image_url ?? p.primary_image?.image_url ?? null,
          }))
        : undefined,
    };
  });
}
