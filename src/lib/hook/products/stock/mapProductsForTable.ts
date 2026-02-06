import { ProductWithStock } from "@/lib/queries/products/getProductWithStock";
import { ProductStatus } from "@/lib/types/enums";

export interface VariantRow {
  id: string;
  productId: string;
  title: string;
  currentPrice: number;
  sku: string | null;
  stock: number;
  imageUrl: string | null;
  isLowStock: boolean;
  isOutOfStock: boolean; // ✅ NEW
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ProductRow {
  id: string;
  title: string;
  currentPrice: number | null;
  sku: string | null;
  stock: number;
  imageUrl: string | null;
  variants?: VariantRow[];
  isLowStock: boolean;
  isOutOfStock: boolean; // ✅ NEW
  lowStockThreshold: number;
  hasLowStockVariant: boolean;
  status: ProductStatus;
  isInactiveProduct: boolean;
}

export function mapProductsForModernTable(
  products: ProductWithStock[],
): ProductRow[] {
  return products.map((p) => {
    const hasVariants = !!p.variants?.length;

    const productStock = p.stock?.quantity_available ?? 0;
    const productLowStockThreshold = p.stock?.low_stock_threshold || 10;

    // ✅ FIXED LOGIC
    const isProductOutOfStock = !hasVariants && productStock === 0;
    const isProductLowStock =
      !hasVariants &&
      productStock > 0 &&
      productStock <= productLowStockThreshold;

    const processedVariants = hasVariants
      ? p.variants.map((v) => {
          const variantStock = v.stock?.quantity_available ?? 0;
          const variantLowStockThreshold =
            v.stock?.low_stock_threshold || productLowStockThreshold;

          // ✅ FIXED LOGIC
          const isVariantOutOfStock = variantStock === 0;
          const isVariantLowStock =
            variantStock > 0 && variantStock <= variantLowStockThreshold;

          return {
            id: v.id,
            productId: v.product_id,
            title: v.variant_name,
            sku: v.sku ?? null,
            currentPrice:
              v.discounted_price && v.discounted_price > 0
                ? v.discounted_price
                : v.base_price,
            stock: variantStock,
            imageUrl:
              v.primary_image?.image_url ?? p.primary_image?.image_url ?? null,
            isOutOfStock: isVariantOutOfStock,
            isLowStock: isVariantLowStock,
            lowStockThreshold: variantLowStockThreshold,
            isActive: v.is_active,
          };
        })
      : undefined;

    const hasLowStockVariant =
      processedVariants?.some((v) => v.isLowStock) ?? false;

    return {
      id: p.id,
      title: p.name,
      sku: p.sku ?? null,
      currentPrice: hasVariants ? null : p.base_price,
      stock: productStock,
      imageUrl: p.primary_image?.image_url ?? null,

      isOutOfStock: isProductOutOfStock,
      isLowStock: isProductLowStock,

      lowStockThreshold: productLowStockThreshold,
      hasLowStockVariant,
      variants: processedVariants,

      status: p.status,
      isInactiveProduct:
        p.status === ProductStatus.DRAFT || p.status === ProductStatus.INACTIVE,
    };
  });
}
