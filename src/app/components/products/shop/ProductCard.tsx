import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Zap, Check } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  title: string;
  category: string;
  currentPrice: number;
  originalPrice: number;
  rating: number;
  // imageUrl: string;
  productLink: string;
  isLoading?: boolean;
  onAddToCart: () => Promise<void>;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  category,
  currentPrice,
  originalPrice,
  rating,
  // imageUrl,
  productLink,
  onAddToCart,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ✅ Auto calculate discount
  const calculatedDiscount =
    originalPrice > 0
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

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
              : "fill-muted text-muted-foreground"
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
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding) return;

    setIsAdding(true);

    try {
      await onAddToCart();
      window.location.href = "/checkout";
    } catch (error) {
      console.error("Error buying product:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm transition-all duration-500 p-0 bg-card border-border">
      <Link
        href={productLink}
        className="flex flex-col flex-1 cursor-pointer hover:text-foreground"
      >
        {/* Product Image */}
        <div className="relative w-full h-80 overflow-hidden group">
          {/* <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, 300px"
          /> */}
          <div className="absolute inset-0 flex justify-between items-start p-4">
            <span className="text-card-foreground text-xs uppercase tracking-wider bg-background/80 px-2 py-1 rounded-md">
              {category}
            </span>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col p-4 gap-3">
          <h3 className="font-semibold text-lg line-clamp-1 text-foreground">{title}</h3>

          {/* Price + Discount + Rating */}
          <div className="flex flex-col gap-1">
            {/* Price + Discount */}
            <div className="flex items-center justify-between">
              {/* Left side: Price + Old Price */}
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-foreground">
                  ${currentPrice}
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    ${originalPrice}
                  </span>
                )}
              </div>

              {/* Right side: Discount */}
              {calculatedDiscount > 0 && (
                <span className="text-xs font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                  -{calculatedDiscount}%
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <div className="flex">{renderStars()}</div>
              <span className="text-xs">{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Buttons */}
      <div className="flex flex-col gap-2 px-4 pb-4">
        <Button
          variant="secondary"
          size="lg"
          className="gap-2 cursor-pointer"
          onClick={handleBuyNow}
          disabled={isAdding}
        >
          <Zap className="w-4 h-4" />
          <span className="relative top-[-1px]">Buy Now</span>
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
              ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground shadow-lg"
              : "bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
          }`}
        >
          <div className="flex items-center justify-center w-full relative">
            {/* Default text */}
            <div
              className={`flex items-center gap-2 ${
                isAdding || showSuccess
                  ? "opacity-0 -translate-y-4"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="relative top-[-1px]">Add to Cart</span>
            </div>

            {/* Loading state */}
            <div
              className={`absolute flex items-center gap-2 transition-all duration-500 ease-in-out ${
                isAdding && !showSuccess
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin-slow"></div>
              <span>Adding...</span>
            </div>

            {/* Success state */}
            <div
              className={`absolute flex items-center gap-2 ${
                showSuccess
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <Check className="w-5 h-5" />
              <span className="relative top-[-1px]">Added!</span>
            </div>
          </div>
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;