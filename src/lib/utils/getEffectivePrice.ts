/**
 * Whether a discount's optional flash-sale window is currently active.
 * No window set (both null) means the discount is always active —
 * preserves today's behavior for every existing discounted_price with no
 * schedule attached.
 */
export function isSaleActive(
  saleStartsAt?: string | null,
  saleEndsAt?: string | null,
  now: Date = new Date()
): boolean {
  if (!saleStartsAt && !saleEndsAt) return true;
  if (saleStartsAt && now < new Date(saleStartsAt)) return false;
  if (saleEndsAt && now > new Date(saleEndsAt)) return false;
  return true;
}

export interface EffectivePriceInput {
  base_price: number;
  discounted_price?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
}

export interface EffectivePriceResult {
  price: number;
  originalPrice: number;
  isOnSale: boolean;
}

/** The price to actually charge/display right now, given a product/variant's discount and its optional flash-sale window. */
export function getEffectivePrice(
  entity: EffectivePriceInput,
  now: Date = new Date()
): EffectivePriceResult {
  const hasDiscount =
    entity.discounted_price != null &&
    entity.discounted_price > 0 &&
    entity.discounted_price < entity.base_price;
  const isOnSale =
    hasDiscount && isSaleActive(entity.sale_starts_at, entity.sale_ends_at, now);

  return {
    price: isOnSale ? entity.discounted_price! : entity.base_price,
    originalPrice: entity.base_price,
    isOnSale,
  };
}
