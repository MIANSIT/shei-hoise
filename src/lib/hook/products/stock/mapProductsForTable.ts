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
  isOutOfStock: boolean;
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
  isOutOfStock: boolean;
  lowStockThreshold: number;
  hasLowStockVariant: boolean;
  hasOutOfStockVariant: boolean;
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

    const isProductOutOfStock = !hasVariants && productStock === 0;
    const isProductLowStock =
      !hasVariants &&
      productStock > 0 &&
      productStock <= productLowStockThreshold;

    const processedVariants: VariantRow[] | undefined = hasVariants
      ? p.variants.map((v) => {
          const variantStock = v.stock?.quantity_available ?? 0;
          const variantLowStockThreshold =
            v.stock?.low_stock_threshold || productLowStockThreshold;

          return {
            id: v.id,
            productId: v.product_id,
            title: v.variant_name,
            sku: v.sku ?? null,
            currentPrice:
              v.discounted_price != null && v.discounted_price > 0
                ? v.discounted_price
                : v.base_price,
            stock: variantStock,
            imageUrl:
              v.primary_image?.image_url ?? p.primary_image?.image_url ?? null,
            isOutOfStock: variantStock === 0,
            isLowStock:
              variantStock > 0 && variantStock <= variantLowStockThreshold,
            lowStockThreshold: variantLowStockThreshold,
            isActive: v.is_active,
          };
        })
      : undefined;

    const hasOutOfStockVariant =
      processedVariants?.some((v) => v.isOutOfStock) ?? false;
    const hasLowStockVariant =
      processedVariants?.some((v) => v.isLowStock) ?? false;

    return {
      id: p.id,
      title: p.name,
      sku: p.sku ?? null,
      currentPrice: hasVariants
        ? null
        : p.discounted_price != null && p.discounted_price > 0
          ? p.discounted_price
          : p.base_price,
      stock: productStock,
      imageUrl: p.primary_image?.image_url ?? null,
      isOutOfStock: isProductOutOfStock,
      isLowStock: isProductLowStock,
      lowStockThreshold: productLowStockThreshold,
      hasLowStockVariant,
      hasOutOfStockVariant,
      variants: processedVariants,
      status: p.status,
      isInactiveProduct:
        p.status === ProductStatus.DRAFT || p.status === ProductStatus.INACTIVE,
    };
  });
}
