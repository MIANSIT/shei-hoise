// Plain sync helper — deliberately NOT in bundleExplosion.ts, which has
// "use server" and therefore requires every export to be an async Server
// Action. This just builds the (product_id, variant_id) key used to match
// an order line back to its bundle explosion.
export const bundleItemKey = (productId: string, variantId?: string | null) =>
  `${productId}-${variantId || "none"}`;
