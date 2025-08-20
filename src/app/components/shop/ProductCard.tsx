import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Zap, Check } from "lucide-react";
import { useState } from "react";
import { SheiLoader } from "../ui/SheiLoader";

interface ProductCardProps {
  title: string;
  category: string;
  currentPrice: number;
  originalPrice: number;
  rating: number;
  imageUrl: string;
  productLink: string;
  discount?: number;
  onAddToCart: () => Promise<void>;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  category,
  currentPrice,
  originalPrice,
  rating,
  imageUrl,
  productLink,
  onAddToCart,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= fullStars
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-300 text-gray-300"
          }`}
        />
      );
    }
    return stars;
  };

  const handleAddToCart = async () => {
    if (isAdding) return;

    setIsAdding(true);

    try {
      await onAddToCart();

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link href={productLink} className="block">
      <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 p-0 group bg-card">
        <div className="relative w-full h-80 overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, 300px"
          />

          <div className="absolute inset-0 flex justify-between items-start p-4">
            <span className="text-white text-xs uppercase tracking-wider bg-black bg-opacity-50 px-2 py-1 rounded-md">
              {category}
            </span>
          </div>
        </div>

        <div className="flex flex-col p-4 gap-3">
          <h3 className="font-semibold text-lg line-clamp-1 hover:text-primary transition-all duration-300">
            {title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">${currentPrice}</span>
              <span className="text-sm text-muted-foreground line-through">
                ${originalPrice}
              </span>
            </div>
            <div className="flex items-center">
              <div className="flex">{renderStars()}</div>
              <span className="text-sm text-muted-foreground ml-1">
                {rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* ✅ Buttons stop propagation */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="lg"
              className="gap-2 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = "/checkout"; // manual redirect
              }}
            >
              <Zap className="w-4 h-4" />
              <span>Buy Now</span>
            </Button>

            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={isAdding}
              variant="default"
              size="lg"
              className={`gap-2 relative overflow-hidden cursor-pointer ${
                showSuccess
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg"
                  : "bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
              }`}
            >
              <div className="flex items-center justify-center w-full relative">
                {/* Normal state */}
                <div
                  className={`flex items-center gap-2 ${
                    isAdding || showSuccess
                      ? "opacity-0 -translate-y-4"
                      : "opacity-100 translate-y-0"
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </div>

                {/* Loading */}
                <div
                  className={`absolute flex items-center gap-2 ${
                    isAdding && !showSuccess
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                >
                  <SheiLoader size="sm" loaderColor="white" loadingText="Adding..." />
                </div>

                {/* Success */}
                <div
                  className={`absolute flex items-center gap-2 ${
                    showSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>Added!</span>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ProductCard;