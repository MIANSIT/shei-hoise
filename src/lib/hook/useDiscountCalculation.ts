import { useEffect, useState } from "react";

/**
 * ✅ Pure function (usable anywhere, even in loops)
 *
 * Returns null — not undefined — when there is no discount. The result is
 * written straight into the form and then into the update payload, and
 * supabase-js serialises the payload as JSON: an `undefined` field is dropped
 * from the request entirely, so the column keeps whatever it held before and
 * a removed discount silently survives the save. `null` clears it.
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountAmount?: number | null
): number | null {
  if (discountAmount && discountAmount > 0) {
    const newPrice = basePrice - discountAmount;
    return newPrice >= 0 ? newPrice : 0;
  }
  return null;
}

/** ✅ Hook (for React components or controlled forms) */
interface UseDiscountCalculationProps {
  basePrice: number;
  discountAmount?: number | null; // ✅ allow null
}

export function useDiscountCalculation({
  basePrice,
  discountAmount,
}: UseDiscountCalculationProps) {
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null); // ✅ use null

  useEffect(() => {
    if (discountAmount != null && discountAmount > 0) {
      const newPrice = basePrice - discountAmount;
      setDiscountedPrice(newPrice >= 0 ? newPrice : 0);
    } else {
      setDiscountedPrice(null);
    }
  }, [basePrice, discountAmount]);

  return discountedPrice;
}
