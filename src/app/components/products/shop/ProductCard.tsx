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
      return product.variants.some((v) => {
        const inv = v.product_inventory?.[0];
        if (inv && inv.quantity_available > 0) return true;
        if (v.stock && v.stock.quantity_available > 0) return true;
        return false;
      });
    }
    const inv = product.product_inventory?.[0];
    if (inv && inv.quantity_available > 0) return true;
    if (product.stock && product.stock.quantity_available > 0) return true;
    return false;
  };

  const getTotalAvailableStock = (): number => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((total, v) => {
        const inv = v.product_inventory?.[0];
        if (inv) return total + inv.quantity_available;
        if (v.stock) return total + v.stock.quantity_available;
        return total;
      }, 0);
    }
    const inv = product.product_inventory?.[0];
    if (inv) return inv.quantity_available;
    if (product.stock) return product.stock.quantity_available;
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
    }
    const cartItem = cart.find((item) => {
      const productMatch = item.productId === product.id;
      const storeMatch = item.storeSlug === store_slug;
      let variantMatch = false;
      if (item.variantId === null && !variant?.id) variantMatch = true;
      else if (item.variantId === variant?.id) variantMatch = true;
      return productMatch && storeMatch && variantMatch;
    });
    return cartItem?.quantity || 0;
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

  const categoryName = product.category?.name || "General";
  const truncatedCategory =
    categoryName.length > 10 ? categoryName.slice(0, 9) + "…" : categoryName;

  return (
    <div
      className={`
        group relative flex flex-col h-full
        bg-white dark:bg-gray-900
        rounded-2xl overflow-hidden
        border border-gray-100 dark:border-gray-800
        hover:border-gray-200 dark:hover:border-gray-700
        shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        transition-all duration-300 ease-out
        ${!productInStock ? "opacity-70" : ""}
      `}
    >
      {/* ── Image (square, never shrinks) ── */}
      <Link
        href={`${store_slug}/product/${product.slug}`}
        className="block relative overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0"
        style={{ aspectRatio: "1/1" }}
      >
        <Image
          src={displayImage}
          alt={product.name}
          fill
          className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${!productInStock ? "grayscale-30" : ""}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full border border-gray-200/60 dark:border-gray-700/60 shadow-sm whitespace-nowrap">
            <Tag className="w-2.5 h-2.5 shrink-0" />
            <span>{truncatedCategory}</span>
          </span>

          <div className="flex flex-col items-end gap-1">
            {!productInStock && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded-full whitespace-nowrap">
                Sold Out
              </span>
            )}
            {productInStock && calculatedDiscount > 0 && (
              <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-1 rounded-full shadow-sm whitespace-nowrap">
                -{calculatedDiscount}%
              </span>
            )}
            {productInStock && !hasVariants && isMaxInCart && (
              <span className="text-[9px] font-bold bg-blue-500 text-white px-2 py-1 rounded-full whitespace-nowrap">
                Max
              </span>
            )}
          </div>
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-black/20 transition-colors duration-300" />
      </Link>

      {/* ── Info Block ──
          3 rows with fixed heights so ALL cards are identical:
          Row 1: name      — min-h-[2.5rem]  (2 lines reserved)
          Row 2: price     — h-7             (single line)
          Row 3: buttons   — h-9             (action row)
      ── */}
      <div className="flex flex-col p-3 sm:p-4 gap-2 flex-1">
        {/* Row 1 — Name: fixed 2-line height, hard clamp, no overflow */}
        <Link
          href={`${store_slug}/product/${product.slug}`}
          className="block h-10 sm:h-11 overflow-hidden"
        >
          <h3
            className={`font-semibold text-xs sm:text-sm leading-5 sm:leading-5.5 line-clamp-2 transition-colors duration-200 ${
              productInStock
                ? "text-gray-900 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white"
                : "text-gray-400 dark:text-gray-600"
            }`}
          >
            {formatName(product.name)}
          </h3>
        </Link>

        {/* Row 2 — Price block: always exactly h-[3.25rem] */}
        <div className="h-13 sm:h-14 flex flex-col justify-center gap-1">
          {/* Line A: price + strikethrough */}
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-base sm:text-xl font-bold tracking-tight leading-none ${
                productInStock
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            >
              {displayCurrencyIconSafe}
              {displayPrice.toFixed(2)}
            </span>
            {calculatedDiscount > 0 && productInStock && (
              <span className="text-[11px] sm:text-sm text-gray-400 dark:text-gray-500 line-through font-normal leading-none">
                {displayCurrencyIconSafe}
                {product.base_price.toFixed(2)}
              </span>
            )}
          </div>
          {/* Line B: always rendered — variant chip or empty spacer */}
          <div className="h-4.5 flex items-center">
            {hasVariants ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 whitespace-nowrap">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-400" />
                </span>
                Select variant
              </span>
            ) : (
              <span className="opacity-0 text-[9px]">-</span>
            )}
          </div>
        </div>

        {/* Row 3 — Buttons (always h-9, stuck to bottom) */}
        <div className="flex gap-1.5 mt-auto">
          {hasVariants ? (
            <Link
              href={`${store_slug}/product/${product.slug}`}
              className="flex-1"
            >
              <button className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold tracking-wide hover:bg-gray-700 dark:hover:bg-gray-300 active:scale-[0.98] transition-all duration-200">
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
                        : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300"
                    }
                  `}
                >
                  <span
                    className={`flex items-center gap-1.5 transition-all duration-200 ${adding || showSuccess ? "opacity-0 scale-75" : "opacity-100 scale-100"} absolute`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add to Cart</span>
                    <span className="sm:hidden">Add</span>
                  </span>
                  <span
                    className={`flex items-center gap-1.5 transition-all duration-200 ${adding && !showSuccess ? "opacity-100 scale-100" : "opacity-0 scale-75"} absolute`}
                  >
                    <div className="w-3 h-3 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin" />
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
                    border border-gray-200 dark:border-gray-700
                    text-gray-600 dark:text-gray-300
                    bg-white dark:bg-gray-900
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    hover:border-gray-300 dark:hover:border-gray-600
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
