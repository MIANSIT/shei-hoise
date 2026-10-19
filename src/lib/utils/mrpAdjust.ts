export type MrpAdjustMode = "percent" | "amount";

export interface PriceFields {
  base_price: number | null;
  discounted_price: number | null;
  discount_amount?: number | null;
}

export interface AdjustedPrice {
  base_price: number;
  discounted_price: number | null;
  discount_amount: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * New prices for one product/variant after changing its MRP, or null when the
 * new MRP would not be positive. A discount keeps its money amount
 * (discounted = MRP − discount, the same rule as the product form); it is
 * dropped when it would reach the MRP.
 * @param value signed change: +10 raises, -10 lowers (percent or money)
 */
export function adjustMrp(
  row: PriceFields,
  mode: MrpAdjustMode,
  value: number,
): AdjustedPrice | null {
  const oldMrp = Number(row.base_price ?? 0);
  const next = round2(mode === "percent" ? oldMrp * (1 + value / 100) : oldMrp + value);
  if (!Number.isFinite(next) || next <= 0) return null;

  const discounted = Number(row.discounted_price ?? 0);
  const discount =
    Number(row.discount_amount ?? 0) > 0
      ? Number(row.discount_amount)
      : discounted > 0 && discounted < oldMrp
        ? oldMrp - discounted
        : 0;

  if (discount > 0 && next - discount > 0) {
    return {
      base_price: next,
      discounted_price: round2(next - discount),
      discount_amount: round2(discount),
    };
  }
  return { base_price: next, discounted_price: null, discount_amount: null };
}
