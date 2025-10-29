"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { Product } from "@/lib/types/product";

interface ProductCardProps {
  store_slug: string; // ✅ added
  product: Product;
  isLoading?: boolean;
  onAddToCart: () => Promise<void>;
}

export default function ProductCard({
  store_slug,
  product,
  onAddToCart,
  isLoading = false,
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const variant = product.variants?.[0];
  const displayPrice =
    variant?.discounted_price && variant.discounted_price > 0
      ? variant.discounted_price
      : variant?.base_price ??
        product.discounted_price ??
        product.base_price;

  const displayImage =
    variant?.primary_image?.image_url ||
    variant?.product_images?.[0]?.image_url ||
    product.primary_image?.image_url ||
    product.images?.[0] ||
    "/placeholder.png";

  const calculatedDiscount =
    product.base_price > displayPrice
      ? Math.round(
          ((product.base_price - displayPrice) / product.base_price) * 100
        )
      : 0;

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await onAddToCart();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    try {
      await onAddToCart();
      window.location.href = "/checkout";
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm transition-all duration-500 p-0 bg-card border-border">
      {/* ✅ Use store_slug dynamically in link */}
      <Link
        href={`${store_slug}/product/${product.slug}`}
        className="flex flex-col flex-1 cursor-pointer hover:text-foreground"
      >
        <div className="relative w-full h-80 overflow-hidden group">
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
          />
          <div className="absolute inset-0 flex justify-between items-start p-4">
            <span className="text-card-foreground text-xs uppercase tracking-wider bg-background/80 px-2 py-1 rounded-md">
              {product.category?.name || "Uncategorized"}
            </span>
          </div>
        </div>

        <div className="flex flex-col p-4 gap-3">
          <h3 className="font-semibold text-lg line-clamp-1 text-foreground">
            {product.name}
          </h3>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-foreground">
                  {product.variants?.length
                    ? `Starts from $${displayPrice.toFixed(2)}`
                    : `$${displayPrice.toFixed(2)}`}
                </span>
                {calculatedDiscount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    ${product.base_price.toFixed(2)}
                  </span>
                )}
              </div>
              {calculatedDiscount > 0 && (
                <span className="text-xs font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                  -{calculatedDiscount}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <Button
          variant="secondary"
          size="lg"
          className="gap-2 cursor-pointer"
          onClick={handleBuyNow}
          disabled={adding}
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
          disabled={adding}
          variant="default"
          size="lg"
          className={`gap-2 relative overflow-hidden cursor-pointer ${
            showSuccess
              ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground shadow-lg"
              : "bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
          }`}
        >
          <div className="flex items-center justify-center w-full relative">
            <div
              className={`flex items-center gap-2 ${
                adding || showSuccess
                  ? "opacity-0 -translate-y-4"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Add to Cart</span>
            </div>

            <div
              className={`absolute flex items-center gap-2 transition-all duration-500 ease-in-out ${
                adding && !showSuccess
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin-slow"></div>
              <span>Adding...</span>
            </div>

            <div
              className={`absolute flex items-center gap-2 ${
                showSuccess
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <Check className="w-5 h-5" />
              <span>Added!</span>
            </div>
          </div>
        </Button>
      </div>
    </Card>
  );
}
