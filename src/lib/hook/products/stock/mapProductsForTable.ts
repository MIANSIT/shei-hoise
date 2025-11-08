import { ProductWithStock } from "@/lib/queries/products/getProductWithStock";

export interface VariantRow {
  id: string;
  productId: string;
  title: string;
  currentPrice: number;
  stock: number;
  imageUrl: string | null;
  isLowStock: boolean;
  lowStockThreshold: number;
}

export interface ProductRow {
  id: string;
  title: string;
  currentPrice: number | null;
  stock: number;
  imageUrl: string | null;
  variants?: VariantRow[];
  isLowStock: boolean;
  lowStockThreshold: number;
  hasLowStockVariant: boolean; // New field to track if any variant is low stock
}

export function mapProductsForModernTable(
  products: ProductWithStock[]
): ProductRow[] {
  return products.map((p) => {
    const hasVariants = p.variants && p.variants.length > 0;

    // Get low stock threshold from product inventory
    const productLowStockThreshold = p.stock?.low_stock_threshold || 10;
    const productStock = p.stock?.quantity_available ?? 0;
    const isProductLowStock =
      !hasVariants && productStock <= productLowStockThreshold;

    // Process variants and check if any are low stock
    const processedVariants = hasVariants
      ? p.variants.map((v) => {
          const variantStock = v.stock?.quantity_available ?? 0;
          const variantLowStockThreshold =
            v.stock?.low_stock_threshold || productLowStockThreshold;
          const isVariantLowStock = variantStock <= variantLowStockThreshold;

          return {
            id: v.id,
            productId: v.product_id,
            title: v.variant_name,
            currentPrice:
              v.discounted_price && v.discounted_price > 0
                ? v.discounted_price
                : v.base_price,
            stock: variantStock,
            imageUrl:
              v.primary_image?.image_url ?? p.primary_image?.image_url ?? null,
            isLowStock: isVariantLowStock,
            lowStockThreshold: variantLowStockThreshold,
          };
        })
      : undefined;

    // Check if any variant is low stock
    const hasLowStockVariant = processedVariants
      ? processedVariants.some((variant) => variant.isLowStock)
      : false;

    return {
      id: p.id,
      title: p.name,
      currentPrice: hasVariants ? null : p.base_price,
      stock: productStock,
      imageUrl: p.primary_image?.image_url ?? null,
      isLowStock: isProductLowStock,
      lowStockThreshold: productLowStockThreshold,
      hasLowStockVariant: hasLowStockVariant, // Track if any variant is low stock
      variants: processedVariants,
    };
  });
}
