"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Eye } from "lucide-react";
import { Product } from "@/lib/types/product";
import useCartStore from "@/lib/store/cartStore";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface ProductCardProps {
  store_slug: string;
  product: Product;
  isLoading?: boolean;
  onAddToCart: () => Promise<void>;
}

export default function ProductCard({
  store_slug,
  product,
  onAddToCart,
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { cart } = useCartStore();
  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();

  const variant = product.variants?.[0];
  const hasVariants = product.variants && product.variants.length > 0;

  const displayPrice =
    variant?.discounted_price && variant.discounted_price > 0
      ? variant?.discounted_price
      : (variant?.base_price ?? product.discounted_price ?? product.base_price);

  const displayImage =
    variant?.primary_image?.image_url ||
    variant?.product_images?.[0]?.image_url ||
    product.primary_image?.image_url ||
    product.images?.[0] ||
    "/placeholder.png";

  const calculatedDiscount =
    product.base_price > displayPrice
      ? Math.round(
          ((product.base_price - displayPrice) / product.base_price) * 100,
        )
      : 0;

  const isInStock = (): boolean => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some((variant) => {
        const productInventory = variant.product_inventory?.[0];
        if (productInventory && productInventory.quantity_available > 0)
          return true;
        const stock = variant.stock;
        if (stock && stock.quantity_available > 0) return true;
        return false;
      });
    }
    const mainProductInventory = product.product_inventory?.[0];
    if (mainProductInventory && mainProductInventory.quantity_available > 0)
      return true;
    const mainStock = product.stock;
    if (mainStock && mainStock.quantity_available > 0) return true;
    return false;
  };

  const getTotalAvailableStock = (): number => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((total, variant) => {
        const productInventory = variant.product_inventory?.[0];
        if (productInventory)
          return total + productInventory.quantity_available;
        const stock = variant.stock;
        if (stock) return total + stock.quantity_available;
        return total;
      }, 0);
    }
    const mainProductInventory = product.product_inventory?.[0];
    if (mainProductInventory) return mainProductInventory.quantity_available;
    const mainStock = product.stock;
    if (mainStock) return mainStock.quantity_available;
    return 0;
  };

  const getTotalCartQuantity = (): number => {
    if (hasVariants) {
      return cart
        .filter(
          (item) =>
            item.productId === product.id && item.storeSlug === store_slug,
        )
        .reduce((total, item) => total + item.quantity, 0);
    } else {
      const cartItem = cart.find((item) => {
        const productMatch = item.productId === product.id;
        const storeMatch = item.storeSlug === store_slug;
        let variantMatch = false;
        if (item.variantId === null && !variant?.id) variantMatch = true;
        else if (item.variantId === variant?.id) variantMatch = true;
        return productMatch && storeMatch && variantMatch;
      });
      return cartItem?.quantity || 0;
    }
  };

  const totalAvailableStock = getTotalAvailableStock();
  const totalCartQuantity = getTotalCartQuantity();
  const isMaxInCart = !hasVariants && totalCartQuantity >= totalAvailableStock;

  const handleAddToCart = async () => {
    if (adding || !isInStock() || isMaxInCart) return;
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

  const productInStock = isInStock();

  const formatName = (name: string) => {
    if (!name) return "";
    const words = name.split(" ");
    words[0] =
      words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    return words.join(" ");
  };

  const displayCurrencyIconSafe =
    (currencyLoading ? null : (currencyIcon ?? null)) || "৳";

  return (
    <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm transition-all duration-500 p-0 bg-card border-border">
      <Link
        href={`${store_slug}/product/${product.slug}`}
        className="flex flex-col flex-1 cursor-pointer hover:text-foreground"
      >
        {/* 
          Image container:
          - aspect-[4/3] gives a consistent, natural ratio (not too tall, not too wide)
          - object-cover fills the space cleanly; switch to object-contain if product has transparency
          - No fixed h-80 that causes empty gaps for smaller images
        */}
        <div className="relative w-full aspect-4/3 overflow-hidden group">
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-500 ease-in-out group-hover:scale-105 ${
              !productInStock ? "opacity-70 grayscale-30" : ""
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
          />

          {/* Overlay badges */}
          <div className="absolute inset-0 flex justify-between items-start p-3 z-10">
            <span className="text-card-foreground text-xs uppercase tracking-wider bg-(--badge) px-2 py-1 rounded-lg backdrop-blur-sm">
              {product.category?.name || "Uncategorized"}
            </span>

            <div className="flex flex-col items-end gap-1">
              {!productInStock && (
                <span className="text-white text-xs font-bold bg-chart-5 px-2 py-1 rounded-lg">
                  Stock Out
                </span>
              )}
              {productInStock && calculatedDiscount > 0 && (
                <span className="text-card-foreground text-xs font-medium bg-chart-2 px-2 py-1 rounded-lg">
                  Save {calculatedDiscount}%
                </span>
              )}
              {productInStock && !hasVariants && isMaxInCart && (
                <span className="text-card-foreground text-xs font-medium bg-blue-500 px-2 py-1 rounded-lg">
                  Max in Cart
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col p-4 gap-2">
          <span
            className={`font-semibold text-base line-clamp-2 leading-snug ${
              productInStock ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {formatName(product.name)}
          </span>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className={`text-xl font-bold ${
                productInStock ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {displayCurrencyIconSafe}
              {displayPrice.toFixed(2)}
            </span>

            {calculatedDiscount > 0 && productInStock && (
              <span className="text-sm text-chart-5 line-through">
                {displayCurrencyIconSafe}
                {product.base_price.toFixed(2)}
              </span>
            )}
          </div>

          <div className="h-5">
            {hasVariants ? (
              <span className="text-xs font-medium text-popover bg-card-foreground px-1 rounded">
                Price varies by variant
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex gap-2 px-4 pb-4">
        {hasVariants ? (
          <Link
            href={`${store_slug}/product/${product.slug}`}
            className="w-full"
          >
            <Button
              variant="default"
              size="lg"
              className="w-full gap-2 cursor-pointer bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
            >
              <Eye className="w-5 h-5" />
              <span>View Details</span>
            </Button>
          </Link>
        ) : (
          <div className="flex gap-2 w-full">
            {productInStock && !isMaxInCart ? (
              <div className="flex-1 min-w-0">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                  disabled={adding}
                  variant="default"
                  size="sm"
                  className={`w-full gap-2 overflow-hidden cursor-pointer ${
                    showSuccess
                      ? "bg-linear-to-r from-yellow-400 to-yellow-600 text-primary-foreground shadow-lg"
                      : "bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-center w-full relative h-5">
                    <div
                      className={`absolute flex items-center gap-2 transition-all duration-300 ${
                        adding || showSuccess
                          ? "opacity-0 -translate-y-3"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">Add to Cart</span>
                    </div>

                    <div
                      className={`absolute flex items-center gap-2 transition-all duration-300 ${
                        adding && !showSuccess
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-3"
                      }`}
                    >
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs sm:text-sm">Adding...</span>
                    </div>

                    <div
                      className={`absolute flex items-center gap-2 transition-all duration-300 ${
                        showSuccess
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-3"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">Added!</span>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-w-0" />
            )}

            <div
              className={
                productInStock && !isMaxInCart ? "flex-1 min-w-0" : "w-full"
              }
            >
              <Link
                href={`${store_slug}/product/${product.slug}`}
                className="w-full"
              >
                <Button
                  variant="default"
                  size="sm"
                  className="w-full gap-2 cursor-pointer bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
                >
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">View Details</span>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
