import type { ProductType } from "@/lib/schema/productSchema";

/**
 * Turns an existing product into a pre-filled draft for the Add Product form.
 *
 * Copied: name (marked as a copy), description, prices, discount and sale
 * window, category, weight, SEO, flags, variants and images.
 * Not copied: ids (it's a new product), SKUs (they identify one item), and
 * stock — the copy starts at 0 so the same units aren't counted twice.
 * With variants, the product's own discount and sale window are cleared:
 * the form hides them (each variant carries its own price), so a copied one
 * could never be seen or edited and would show up next to the variants'
 * prices.
 * Images keep the original URLs here; uploadOrUpdateProductImages gives the
 * new product its own copy of each file when it's saved.
 */
export function toDuplicateDraft(source: ProductType, copySuffix: string): ProductType {
  const name = `${source.name} ${copySuffix}`.trim();
  const hasVariants = (source.variants ?? []).length > 0;
  return {
    ...source,
    ...(hasVariants
      ? { discount_amount: null, discounted_price: null, sale_starts_at: null, sale_ends_at: null }
      : {}),
    id: undefined,
    name,
    slug: `${source.slug}-copy`,
    sku: "",
    stock: 0,
    variants: (source.variants ?? []).map((variant) => ({
      ...variant,
      id: undefined,
      product_id: undefined,
      sku: "",
      stock: 0,
    })),
    images: (source.images ?? []).map((image) => ({ ...image })),
  };
}
