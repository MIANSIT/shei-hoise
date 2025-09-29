// utils/mapProductsForTable.ts
import { ProductWithStock } from "../../../queries/products/getProductWithStock";

export interface TableProduct {
  id: string;
  title: string;
  currentPrice: number;
  stock: number;
  imageUrl: string | null;
}

export function mapProductsForTable(products: ProductWithStock[]): TableProduct[] {
  const tableData: TableProduct[] = [];

  products.forEach((p) => {
    if (p.variants.length === 0) {
      // Product has no variants
      tableData.push({
        id: p.id,
        title: p.name,
        currentPrice: p.base_price,
        stock: p.stock?.quantity_available ?? 0,
        imageUrl: p.primary_image?.image_url ?? null,
      });
    } else {
      // Product has variants, create a row per variant
      p.variants.forEach((v) => {
        tableData.push({
          id: v.id,
          title: `${p.name} - ${v.variant_name}`,
          currentPrice: v.price,
          stock: v.stock.quantity_available,
          imageUrl: v.primary_image?.image_url ?? p.primary_image?.image_url ?? null,
        });
      });
    }
  });

  return tableData;
}
