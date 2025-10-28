/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProductsWithVariants, ProductWithVariants } from "./getProductsWithVariants";
import { getCategoriesQuery } from "../categories/getCategories";
export async function getProductsWithCategory(storeId: string) {
  const [productsRes, categoriesRes] = await Promise.all([
    getProductsWithVariants(storeId),
    getCategoriesQuery(storeId),
  ]);

  const categories = categoriesRes.data ?? [];
  const categoryMap: Record<string, string> = {};
  categories.forEach((c: { id: string | number; name: string; }) => {
    categoryMap[c.id] = c.name;
  });
  const productsWithCategory: ProductWithVariants[] = productsRes.map((p: any) => ({
    ...p,
    category: p.category_id ? { id: p.category_id, name: categoryMap[p.category_id] || "None" } : null,
    product_variants: p.product_variants ?? [],
  }));

  return productsWithCategory;
}
