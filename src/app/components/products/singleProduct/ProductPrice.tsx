import { FC } from "react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface ProductPriceProps {
  price: number; // discounted price
  originalPrice?: number; // original price
}

const ProductPrice: FC<ProductPriceProps> = ({ price, originalPrice }) => {
  const hasDiscount = originalPrice && originalPrice > price;

  const {
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();

  const displayCurrencyIconSafe = currencyLoading ? "৳" : currencyIcon ?? "৳";

  // ✅ Calculate discount percentage automatically
  const discountPercent =
    hasDiscount && originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-2xl font-bold">
        {displayCurrencyIconSafe}
        {price.toFixed(2)}
      </span>

      {hasDiscount && originalPrice && (
        <>
          <span className="line-through text-destructive">
            {displayCurrencyIconSafe}
            {originalPrice.toFixed(2)}
          </span>

          {discountPercent > 0 && (
            <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
              Save {discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default ProductPrice;
