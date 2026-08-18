import { FC } from "react";
import { Truck } from "lucide-react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useTranslation } from "@/lib/hook/useTranslation";

interface ProductPriceProps {
  price: number; // discounted price
  originalPrice?: number; // original price
  /** Product ships free — shown as a tag next to the price, like the discount tag. */
  freeDelivery?: boolean;
}

const ProductPrice: FC<ProductPriceProps> = ({
  price,
  originalPrice,
  freeDelivery = false,
}) => {
  const hasDiscount = originalPrice && originalPrice > price;

  const {
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();

  const displayCurrencyIconSafe = currencyLoading ? "৳" : currencyIcon ?? "৳";
  const n = useLocalNum();
  const t = useTranslation();

  // ✅ Calculate discount percentage automatically
  const discountPercent =
    hasDiscount && originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-2xl font-bold">
        {displayCurrencyIconSafe}
        {n(price.toFixed(2))}
      </span>

      {hasDiscount && originalPrice && (
        <>
          <span className="line-through text-destructive">
            {displayCurrencyIconSafe}
            {n(originalPrice.toFixed(2))}
          </span>

          {discountPercent > 0 && (
            <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
              {t.cart.save} {n(discountPercent)}%
            </span>
          )}
        </>
      )}

      {freeDelivery && (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
          <Truck className="h-3.5 w-3.5" />
          {t.product.freeDeliveryTag}
        </span>
      )}
    </div>
  );
};

export default ProductPrice;
