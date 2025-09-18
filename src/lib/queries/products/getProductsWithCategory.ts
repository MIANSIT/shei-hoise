import { getProductsWithVariants, ProductWithVariants } from "./getProductsWithVariants";
import { getCategoriesQuery } from "../categories/getCategories";

/**
 * Fetch products with their variants and attach category name
 */
export async function getProductsWithCategory(storeId: string) {
  // fetch products and categories in parallel
  const [productsRes, categoriesRes] = await Promise.all([
    getProductsWithVariants(storeId),
    getCategoriesQuery(storeId),
  ]);

  const categories = categoriesRes.data ?? [];

  // create a lookup map for categories
  const categoryMap: Record<string, string> = {};
  categories.forEach((c) => {
    categoryMap[c.id] = c.name;
  });

  // attach category name to each product
  const productsWithCategory: ProductWithVariants[] = productsRes.map((p: any) => ({
    ...p,
    category: p.category_id ? { id: p.category_id, name: categoryMap[p.category_id] || "None" } : null,
    product_variants: p.product_variants ?? [],
  }));

  return productsWithCategory;
}
