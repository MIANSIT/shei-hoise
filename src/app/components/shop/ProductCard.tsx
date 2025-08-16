import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FaShoppingCart, FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";
import { SheiLoader } from "../ui//SheiLoader";
interface ProductCardProps {
  title: string;
  category: string;
  currentPrice: string;
  originalPrice: string;
  rating: number;
  imageUrl: string;
  productLink: string;
  discount?: number;
  isLoading?: boolean;
  onAddToCart: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  category,
  currentPrice,
  originalPrice,
  rating,
  imageUrl,
  productLink,
  discount,
  isLoading,
  onAddToCart,
}) => {
  const discountPercentage = discount || 
    Math.round((1 - parseFloat(currentPrice) / parseFloat(originalPrice)) * 100);

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 p-0 group">
      <div className="relative w-full h-80 overflow-hidden">
        <Link href={productLink} className="flex justify-center items-center w-full h-full">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        </Link>
        <div className="absolute inset-0 flex justify-between items-start p-4">
          <span className="text-white text-xs uppercase tracking-wider bg-black bg-opacity-50 px-2 py-1 rounded-md">
            {category}
          </span>
          {discountPercentage > 0 && (
            <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">
              {discountPercentage}% OFF
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{title}</h3>
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400">
            {renderStars()}
          </div>
          <span className="text-sm text-gray-500 ml-1">{rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="font-bold text-lg text-white">${currentPrice}</span>
          <span className="text-sm text-gray-500 line-through">${originalPrice}</span>
        </div>
        <button
      onClick={onAddToCart}
      disabled={isLoading}
      className="flex items-center justify-center text-sm gap-2 bg-white text-black py-2 px-4 rounded-md hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <SheiLoader size="sm" loaderColor="black" />
      ) : (
        <>
          <FaShoppingCart className="text-black" />
          Add to Cart
        </>
      )}
    </button>
      </div>
    </Card>
  );
};

export default ProductCard;