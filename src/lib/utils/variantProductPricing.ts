interface PricedVariant {
  base_price?: number | null;
  is_active?: boolean | null;
}

/**
 * Product-level price for a product that has variants.
 *
 * The form hides the product's own price once variants exist, so whatever was
 * left in it (e.g. copied by Duplicate, or typed before variants were added)
 * is stale. The list price is the lowest active variant price, falling back to
 * the lowest of any variant when none is active.
 * @returns the price, or undefined when no variant has one
 */
export function getVariantListPrice(variants: readonly PricedVariant[]): number | undefined {
  const prices = (active: boolean) =>
    variants
      .filter((v) => !active || v.is_active !== false)
      .map((v) => Number(v.base_price))
      .filter((price) => Number.isFinite(price) && price > 0);

  const pool = prices(true).length > 0 ? prices(true) : prices(false);
  return pool.length > 0 ? Math.min(...pool) : undefined;
}
