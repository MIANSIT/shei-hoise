import { FC } from "react";

interface ProductTitleProps {
  name: string;
  category: string;
  rating: number;
}

const ProductTitle: FC<ProductTitleProps> = ({ name, category, rating }) => {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{name}</h1>
      <p className="text-gray-500 text-sm">{category}</p>
      {/* <div className="flex items-center gap-1 text-yellow-500 mt-1">
        {"⭐".repeat(Math.floor(rating))}
        <span className="text-gray-600 text-sm">({rating})</span>
      </div> */}
    </div>
  );
};

export default ProductTitle;
