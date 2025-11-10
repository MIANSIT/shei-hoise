"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Eye } from "lucide-react";
import { Product } from "@/lib/types/product";
import useCartStore from "@/lib/store/cartStore";

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
  isLoading = false,
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { cart } = useCartStore();

  const variant = product.variants?.[0];
  const hasVariants = product.variants && product.variants.length > 0;
  const displayPrice =
    variant?.discounted_price && variant.discounted_price > 0
      ? variant?.discounted_price
      : variant?.base_price ?? product.discounted_price ?? product.base_price;

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

  // Check if product is in stock
  const isInStock = (): boolean => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(variant => {
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

  // Get available stock for this product
  const getAvailableStock = (): number => {
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      const productInventory = variant.product_inventory?.[0];
      if (productInventory) {
        return productInventory.quantity_available;
      }
      const stock = variant.stock;
      if (stock) {
        return stock.quantity_available;
      }
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

  // Get current cart quantity for this product - FIXED
  const getCartQuantity = (): number => {
    const cartItem = cart.find(
      (item) => {
        const productMatch = item.productId === product.id;
        const storeMatch = item.storeSlug === store_slug;
        
        // Handle variant matching: both null/undefined or same ID
        let variantMatch = false;
        if (item.variantId === null && !variant?.id) {
          variantMatch = true; // Both are null/undefined
        } else if (item.variantId === variant?.id) {
          variantMatch = true; // Both have same ID
        }
        
        return productMatch && storeMatch && variantMatch;
      }
    );
    
    return cartItem?.quantity || 0;
  };

  const availableStock = getAvailableStock();
  const cartQuantity = getCartQuantity();
  const remainingStock = availableStock - cartQuantity;
  const isOutOfStock = remainingStock <= 0;
  const isMaxInCart = cartQuantity >= availableStock;

  // Debug logs
  console.log("🛒 ProductCard Debug:", {
    productName: product.name,
    productId: product.id,
    variantId: variant?.id,
    availableStock,
    cartQuantity,
    remainingStock,
    isOutOfStock,
    isMaxInCart,
    hasVariants
  });

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

  return (
    <Card className={`flex flex-col rounded-lg overflow-hidden shadow-sm transition-all duration-500 p-0 bg-card border-border ${
      !productInStock ? "opacity-70" : ""
    }`}>
      <Link
        href={`${store_slug}/product/${product.slug}`}
        className="flex flex-col flex-1 cursor-pointer hover:text-foreground"
      >
        <div className="relative w-full h-80 overflow-hidden group">
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-500 ease-in-out ${
              productInStock ? "group-hover:scale-110" : "grayscale"
            }`}
          />
          <div className="absolute inset-0 flex justify-between items-start p-4">
            <span className="text-card-foreground text-xs uppercase tracking-wider bg-background/80 px-2 py-1 rounded-lg">
              {product.category?.name || "Uncategorized"}
            </span>
            
            {calculatedDiscount > 0 && productInStock && (
              <span className="text-card-foreground text-xs font-medium bg-destructive px-2 py-1 rounded-lg">
                -{calculatedDiscount}%
              </span>
            )}
            
            {!productInStock && (
              <span className="text-card-foreground text-xs font-medium bg-gray-500 px-2 py-1 rounded-lg">
                Out of Stock
              </span>
            )}
            
            {productInStock && isMaxInCart && (
              <span className="text-card-foreground text-xs font-medium bg-blue-500 px-2 py-1 rounded-lg">
                Max in Cart
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col p-4 gap-3">
          <h3 className="font-semibold text-lg line-clamp-1 text-foreground">
            {product.name}
          </h3>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xl font-semibold ${
                  productInStock ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {product.variants?.length
                    ? `Starts from ৳ ${displayPrice.toFixed(2)}`
                    : `৳ ${displayPrice.toFixed(2)}`}
                </span>
                {calculatedDiscount > 0 && productInStock && (
                  <span className="text-sm text-muted-foreground line-through">
                    ৳ {product.base_price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
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
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground shadow-lg"
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

            <div className={`${productInStock && !isMaxInCart ? 'flex-1 min-w-0' : 'w-full'}`}>
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