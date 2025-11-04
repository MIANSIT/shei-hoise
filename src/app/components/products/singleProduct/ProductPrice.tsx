import { FC } from "react";

interface ProductPriceProps {
  price: number;
  originalPrice?: number;
  discount?: number; // ✅ Added discount prop
}

const ProductPrice: FC<ProductPriceProps> = ({ price, originalPrice, discount }) => {
  const hasDiscount = originalPrice && originalPrice > price;
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-2xl font-bold">${price.toFixed(2)}</span>
      {hasDiscount && (
        <>
          <span className="line-through text-ring">${originalPrice.toFixed(2)}</span>
          {discount && discount > 0 && (
            <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
              Save {discount}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default ProductPrice;