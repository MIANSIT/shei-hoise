import { useEffect, useState } from "react";

/** ✅ Pure function (usable anywhere, even in loops) */
export function calculateDiscountedPrice(
  basePrice: number,
  discountAmount?: number
): number | undefined {
  if (discountAmount && discountAmount > 0) {
    const newPrice = basePrice - discountAmount;
    return newPrice >= 0 ? newPrice : 0;
  }
  return undefined;
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
