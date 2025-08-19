import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProductCardProps {
  title: string;
  category: string;
  currentPrice: number;
  originalPrice: number;
  rating: number;
  imageUrl: string;
  productLink: string;
  discount?: number;
  isLoading?: boolean;
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
  isLoading,
  onAddToCart,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStage, setAnimationStage] = useState<
    "initial" | "cartMoving" | "textVisible" | "cartReturning"
  >("initial");

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
    if (isAnimating) return;

    setIsAnimating(true);
    setAnimationStage("cartMoving");
    setTimeout(() => {
      setAnimationStage("textVisible");
    }, 400);
    setTimeout(() => {
      setAnimationStage("cartReturning");
    }, 1500);
    setTimeout(async () => {
      await onAddToCart();
      setAnimationStage("initial");
      setIsAnimating(false);
    }, 2000);
  };

  return (
    <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 p-0 group bg-card">
      <div className="relative w-full h-80 overflow-hidden">
        <Link
          href={productLink}
          className="flex justify-center items-center w-full h-full"
        >
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
        </div>
      </div>
      <div className="flex flex-col p-4 gap-3">
        <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
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
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary" size="lg" className="gap-2">
            <Link href="/checkout">
              <Zap className="w-4 h-4" />
              <span className="relative top-[-1px]">Buy Now</span>
            </Link>
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={isLoading || isAnimating}
            variant="default"
            size="lg"
            className="gap-2 cursor-pointer relative bg-primary hover:bg-primary/90 transition-colors"
          >
            <div className="flex items-center justify-center w-full">
              <AnimatePresence mode="wait">
                {animationStage === "initial" && (
                  <motion.div
                    key="initial-cart"
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="relative top-[-1px]">Add to Cart</span>
                  </motion.div>
                )}
                {animationStage === "cartMoving" && (
                  <motion.div
                    key="moving-cart"
                    initial={{ x: 0, opacity: 1, scale: 1 }}
                    animate={{ x: 0, opacity: 0, scale: 1.2 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </motion.div>
                )}
                {animationStage === "textVisible" && (
                  <motion.div
                    key="text-visible"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="font-medium"
                  >
                    <span className="relative top-[-1px]">Added to Cart</span>
                  </motion.div>
                )}
                {animationStage === "cartReturning" && (
                  <motion.div
                    key="returning-cart"
                    initial={{ x: -20, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
