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
}: // isLoading = false,
ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { cart } = useCartStore();
  const {
    // currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
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

  // Check if product is in stock - FIXED: Check all variants
  const isInStock = (): boolean => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some((variant) => {
        const productInventory = variant.product_inventory?.[0];
        if (productInventory && productInventory.quantity_available > 0) {
          return true;
        }
        const stock = variant.stock;
        if (stock && stock.quantity_available > 0) {
          return true;
        }
        return false;
      });
    }

    const mainProductInventory = product.product_inventory?.[0];
    if (mainProductInventory && mainProductInventory.quantity_available > 0) {
      return true;
    }
    const mainStock = product.stock;
    if (mainStock && mainStock.quantity_available > 0) {
      return true;
    }

    return false;
  };

  // Get total available stock for this product - FIXED: Sum all variants
  const getTotalAvailableStock = (): number => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((total, variant) => {
        const productInventory = variant.product_inventory?.[0];
        if (productInventory) {
          return total + productInventory.quantity_available;
        }
        const stock = variant.stock;
        if (stock) {
          return total + stock.quantity_available;
        }
        return total;
      }, 0);
    }

    const mainProductInventory = product.product_inventory?.[0];
    if (mainProductInventory) {
      return mainProductInventory.quantity_available;
    }
    const mainStock = product.stock;
    if (mainStock) {
      return mainStock.quantity_available;
    }

    return 0;
  };

  // Get current cart quantity for this product - FIXED: Sum all variants in cart
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
        if (item.variantId === null && !variant?.id) {
          variantMatch = true;
        } else if (item.variantId === variant?.id) {
          variantMatch = true;
        }

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

  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳";

  return (
    <Card
      className={`flex flex-col rounded-lg overflow-hidden shadow-sm transition-all duration-500 p-0 bg-card border-border `}
    >
      <Link
        href={`${store_slug}/product/${product.slug}`}
        className="flex flex-col flex-1 cursor-pointer hover:text-foreground"
      >
        {/* Image container with modern bg for transparent images */}
        <div className="relative w-full h-80 overflow-hidden group bg-[radial-gradient(ellipse_at_center,#f8f8f8_0%,#ececec_100%)]">
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
            style={{
              backgroundImage:
                "linear-gradient(#888 1px, transparent 1px), linear-gradient(90deg, #888 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <Image
            src={displayImage}
            alt={product.name}
            fill
            className={`object-contain transition-transform duration-500 ease-in-out group-hover:scale-105 relative z-20`}
          />

          <div className="absolute inset-0 flex justify-between items-start p-4 z-30">
            {/* Category Badge */}
            <span className="text-card-foreground text-xs uppercase tracking-wider bg-(--badge) px-2 py-1 rounded-lg">
              {product.category?.name || "Uncategorized"}
            </span>

            <div className="flex flex-col items-end gap-1">
              {/* Out of Stock */}
              {!productInStock && (
                <span className="text-white text-xs font-bold bg-chart-5 px-2 py-1 rounded-lg">
                  Stock Out
                </span>
              )}

              {/* Discount - only show if in stock */}
              {productInStock && calculatedDiscount > 0 && (
                <span className="text-card-foreground text-xs font-medium bg-chart-2 px-2 py-1 rounded-lg">
                  Save {calculatedDiscount}%
                </span>
              )}

              {/* Max in Cart - only for products without variants */}
              {productInStock && !hasVariants && isMaxInCart && (
                <span className="text-card-foreground text-xs font-medium bg-blue-500 px-2 py-1 rounded-lg">
                  Max in Cart
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col p-4 gap-3">
          <span
            className={`font-semibold text-lg line-clamp-1 text-foreground ${
              productInStock ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {formatName(product.name)}
          </span>

          {/* Price Box */}
          <div className="flex felx-wrap items-center gap-3">
            <span
              className={`text-xl sm:text-2xl font-bold ${
                productInStock ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {displayCurrencyIconSafe}
              {displayPrice.toFixed(2)}
            </span>

            {calculatedDiscount > 0 && productInStock && (
              <span className="text-sm sm:text-base text-chart-5 line-through relative">
                {displayCurrencyIconSafe} {product.base_price.toFixed(2)}
              </span>
            )}
          </div>
          <div className="mt-1 h-2.5">
            {hasVariants ? (
              <span className="text-xs font-medium text-popover bg-card-foreground px-1 rounded">
                Price varies by variant
              </span>
            ) : (
              <span className="text-xs text-transparent">Placeholder</span>
            )}
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
                  <div className="flex items-center justify-center w-full">
                    <div
                      className={`flex items-center gap-2 ${
                        adding || showSuccess
                          ? "opacity-0 -translate-y-4"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm">Add to Cart</span>
                    </div>

                    <div
                      className={`absolute flex items-center gap-2 transition-all duration-500 ease-in-out ${
                        adding && !showSuccess
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                    >
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin-slow"></div>
                      <span className="text-xs sm:text-sm">Adding...</span>
                    </div>

                    <div
                      className={`absolute flex items-center gap-2 ${
                        showSuccess
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm">Added!</span>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                {/* Empty when max in cart */}
              </div>
            )}

            <div
              className={`${
                productInStock && !isMaxInCart ? "flex-1 min-w-0" : "w-full"
              }`}
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
