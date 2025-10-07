// File: hooks/useDiscountCalculation.ts
import { useEffect, useState } from "react";

interface UseDiscountCalculationProps {
  basePrice: number;
  discountAmount?: number; // make it optional
}

export const useDiscountCalculation = ({
  basePrice,
  discountAmount,
}: UseDiscountCalculationProps) => {
  const [discountedPrice, setDiscountedPrice] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (discountAmount && discountAmount > 0) {
      const newPrice = basePrice - discountAmount;
      setDiscountedPrice(newPrice >= 0 ? newPrice : 0);
    } else {
      setDiscountedPrice(undefined); // no discount, leave undefined
    }
  }, [basePrice, discountAmount]);

  return discountedPrice;
};
