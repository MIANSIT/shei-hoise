import { ProductType, ProductVariantType } from "@/lib/schema/productSchema";

export interface VariantRow {
  id: string;
  title: string;
  currentPrice?: number | null;
  stock?: number;
  sku?: string;
  productId: string; // guaranteed string
  imageUrl?: string | null;
}

export interface ProductRow {
  id: string;
  title: string;
  currentPrice?: number | null;
  stock?: number;
  sku?: string;
  imageUrl?: string | null;
  variants?: VariantRow[];
}

export function mapProductsForTable(products: ProductType[]): ProductRow[] {
  return products.map((p) => {
    if (!p.id) throw new Error("Product id is required");

    const mainImage =
      p.images?.find((img) => img.isPrimary)?.imageUrl ??
      p.images?.[0]?.imageUrl ??
      null;

    return {
      id: p.id,
      title: p.name,
      currentPrice: p.base_price ?? null,
      stock: p.stock ?? 0,
      sku: p.sku ?? undefined,
      imageUrl: mainImage,
      variants:
        p.variants?.map((v: ProductVariantType) => {
          if (!v.id) throw new Error("Variant id is required");
          if (!p.id) throw new Error("Parent product id is required");

          return {
            id: v.id,
            title: v.variant_name,
            currentPrice: v.base_price ?? null,
            stock: v.stock ?? 0,
            sku: v.sku ?? undefined,
            productId: p.id, // guaranteed string now
            imageUrl: mainImage, // parent product image
          };
        }) ?? [],
    };
  });
}
