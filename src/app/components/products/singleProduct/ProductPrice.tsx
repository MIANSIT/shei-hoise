import { FC } from "react";

interface ProductPriceProps {
  price: number;
  originalPrice?: number;
}

const ProductPrice: FC<ProductPriceProps> = ({ price, originalPrice }) => {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-2xl font-bold">${price.toFixed(2)}</span>
      {originalPrice && (
        <span className="line-through text-ring">${originalPrice.toFixed(2)}</span>
      )}
    </div>
  );
};

export default ProductPrice;
