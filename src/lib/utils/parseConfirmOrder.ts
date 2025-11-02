export interface ParsedOrderItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export function parseConfirmOrder(products: string[]): ParsedOrderItem[] {
  return products.map((item) => {
    const parts = item.split("@").filter(Boolean); // sanity check to remove empty strings
    if (parts.length === 3) {
      const [productId, variantId, quantity] = parts;
      return {
        productId,
        variantId,
        quantity: Number(quantity) || 1,
      };
    }

    if (parts.length === 2) {
      const [productId, quantity] = parts;
      return {
        productId,
        variantId: null,
        quantity: Number(quantity) || 1,
      };
    }

    // fallback (invalid or unexpected format)
    return {
      productId: item,
      variantId: null,
      quantity: 1,
    };
  });
}
