"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Check, Eye, Tag } from "lucide-react";
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
  const displayCurrencyIconSafe =
    (currencyLoading ? null : (currencyIcon ?? null)) || "৳";

  const formatName = (name: string) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  return (
    <div
      className={`
        group relative flex flex-col bg-white rounded-2xl overflow-hidden
        border border-gray-100 hover:border-gray-200
        shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]
        transition-all duration-300 ease-out
        ${!productInStock ? "opacity-70" : ""}
      `}
    >
      {/* Image Block */}
      <Link
        href={`${store_slug}/product/${product.slug}`}
        className="block relative overflow-hidden bg-gray-50"
        style={{ aspectRatio: "1/1" }}
      >
        <Image
          src={displayImage}
          alt={product.name}
          fill
          className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${!productInStock ? "grayscale-30" : ""}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 pointer-events-none">
          {/* Category pill */}
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest bg-white/90 backdrop-blur-sm text-gray-600 px-2.5 py-1 rounded-full border border-gray-200/60 shadow-sm">
            <Tag className="w-2.5 h-2.5" />
            {product.category?.name || "General"}
          </span>

          <div className="flex flex-col items-end gap-1.5">
            {!productInStock && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-900 text-white px-2.5 py-1 rounded-full">
                Sold Out
              </span>
            )}
            {productInStock && calculatedDiscount > 0 && (
              <span className="text-[10px] font-bold bg-rose-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                -{calculatedDiscount}%
              </span>
            )}
            {productInStock && !hasVariants && isMaxInCart && (
              <span className="text-[10px] font-bold bg-blue-500 text-white px-2.5 py-1 rounded-full">
                Max Added
              </span>
            )}
          </div>
        </div>

        {/* Quick view overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      </Link>

      {/* Info Block */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <Link href={`${store_slug}/product/${product.slug}`}>
          <h3
            className={`font-semibold text-sm leading-snug line-clamp-2 transition-colors duration-200 ${
              productInStock
                ? "text-gray-900 group-hover:text-black"
                : "text-gray-400"
            }`}
          >
            {formatName(product.name)}
          </h3>
        </Link>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span
            className={`text-lg font-bold tracking-tight ${productInStock ? "text-gray-900" : "text-gray-400"}`}
          >
            {displayCurrencyIconSafe}
            {displayPrice.toFixed(2)}
          </span>
          {calculatedDiscount > 0 && productInStock && (
            <span className="text-sm text-gray-400 line-through font-normal">
              {displayCurrencyIconSafe}
              {product.base_price.toFixed(2)}
            </span>
          )}
          {hasVariants && (
            <span className="text-xs text-gray-400 ml-auto">varies</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          {hasVariants ? (
            <Link
              href={`${store_slug}/product/${product.slug}`}
              className="flex-1"
            >
              <button className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gray-900 text-white text-xs font-semibold tracking-wide hover:bg-gray-700 active:scale-[0.98] transition-all duration-200">
                <Eye className="w-3.5 h-3.5" />
                View Options
              </button>
            </Link>
          ) : (
            <>
              {productInStock && !isMaxInCart && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                  disabled={adding}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold tracking-wide
                    active:scale-[0.98] transition-all duration-200 overflow-hidden relative
                    ${
                      showSuccess
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                    }
                  `}
                >
                  <span
                    className={`flex items-center gap-1.5 transition-all duration-200 ${adding || showSuccess ? "opacity-0 scale-75" : "opacity-100 scale-100"} absolute`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                  </span>
                  <span
                    className={`flex items-center gap-1.5 transition-all duration-200 ${adding && !showSuccess ? "opacity-100 scale-100" : "opacity-0 scale-75"} absolute`}
                  >
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding
                  </span>
                  <span
                    className={`flex items-center gap-1.5 transition-all duration-200 ${showSuccess ? "opacity-100 scale-100" : "opacity-0 scale-75"} absolute`}
                  >
                    <Check className="w-3.5 h-3.5" /> Added!
                  </span>
                </button>
              )}
              <Link
                href={`${store_slug}/product/${product.slug}`}
                className={productInStock && !isMaxInCart ? "" : "flex-1"}
              >
                <button
                  className={`
                    flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold tracking-wide
                    border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300
                    active:scale-[0.98] transition-all duration-200
                    ${productInStock && !isMaxInCart ? "w-9 px-0" : "w-full px-3"}
                  `}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  {(!productInStock || isMaxInCart) && (
                    <span>View Details</span>
                  )}
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
