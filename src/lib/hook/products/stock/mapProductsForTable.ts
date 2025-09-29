// utils/mapProductsForModernTable.ts
import { ProductWithStock } from "../../../queries/products/getProductWithStock";

export interface VariantRow {
  id: string;
  title: string;
  currentPrice: number;
  stock: number;
  imageUrl: string | null;
}

export interface ProductRow {
  id: string;
  title: string;
  currentPrice: number;
  stock: number;
  imageUrl: string | null;
  variants?: VariantRow[];
}

export function mapProductsForModernTable(
  products: ProductWithStock[]
): ProductRow[] {
  return products.map((p) => {
    if (p.variants.length === 0) {
      return {
        id: p.id,
        title: p.name,
        currentPrice: p.base_price,
        stock: p.stock?.quantity_available ?? 0,
        imageUrl: p.primary_image?.image_url ?? null,
      };
    } else {
      return {
        id: p.id,
        title: p.name,
        currentPrice: p.base_price,
        stock: p.stock?.quantity_available ?? 0,
        imageUrl: p.primary_image?.image_url ?? null,
        variants: p.variants.map((v) => ({
          id: v.id,
          title: v.variant_name,
          currentPrice: v.price,
          stock: v.stock.quantity_available,
          imageUrl:
            v.primary_image?.image_url ?? p.primary_image?.image_url ?? null,
        })),
      };
    }
  });
}
