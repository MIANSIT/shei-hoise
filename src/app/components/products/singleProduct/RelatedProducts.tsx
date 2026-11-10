"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductCard from "@/app/components/products/shop/ProductCard";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getProductRatingSummaries, type RatingSummary } from "@/lib/queries/reviews/getProductRatingSummaries";
import { getAutoApplyCoupons } from "@/lib/queries/coupons/getAutoApplyCoupons";
import useCartStore from "@/lib/store/cartStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { Product } from "@/lib/types/product";
import type { Coupon } from "@/lib/types/coupon";
import type { AddToCartType } from "@/lib/schema/checkoutSchema";

/** Most products shown (the widest screens); smaller screens show fewer of the same list. */
const MAX_SHOWN = 6;

interface RelatedProductsProps {
  storeSlug: string;
  storeId: string | null;
  /** The product being viewed: it is never listed. */
  currentProductId: string;
  categorySlug: string;
}

/** True when the product (or any of its variants) can be bought now. */
function canBuy(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.some(
      (v) => (v.product_inventory?.[0]?.quantity_available ?? 0) > 0 || (v.stock?.quantity_available ?? 0) > 0,
    );
  }
  return (product.product_inventory?.[0]?.quantity_available ?? 0) > 0 || (product.stock?.quantity_available ?? 0) > 0;
}

/**
 * "You may also like": other in-stock products from the same category, under a product page.
 * Phones: 2 columns (4 products, like the Shop page). Tablet and up: one row of 4, 5 or 6 products by screen width.
 * Hidden while loading and when the category has nothing else to show.
 */
export function RelatedProducts({ storeSlug, storeId, currentProductId, categorySlug }: RelatedProductsProps) {
  const t = useTranslation();
  const { addToCart } = useCartStore();
  const { success, error: showError } = useSheiNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // How many of the listed products come from the same category (the rest are the store's other products).
  const [sameCategoryCount, setSameCategoryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const pick = (list: Product[], skip: Set<string>) =>
      list.filter((p) => p.id !== currentProductId && !skip.has(p.id) && canBuy(p));

    (async () => {
      // 1. The same category first.
      const sameCategory = await clientGetProducts(storeSlug, 1, MAX_SHOWN + 2, categorySlug, undefined, "newest", undefined, undefined, "in")
        .then((res) => pick(res.products, new Set()).slice(0, MAX_SHOWN))
        .catch(() => [] as Product[]);
      // 2. A small category fills the row with the store's newest other products, so it is not left empty.
      let list = sameCategory;
      if (list.length < MAX_SHOWN) {
        const taken = new Set(list.map((p) => p.id));
        const others = await clientGetProducts(storeSlug, 1, MAX_SHOWN + 4, undefined, undefined, "newest", undefined, undefined, "in")
          .then((res) => pick(res.products, taken))
          .catch(() => [] as Product[]);
        list = [...list, ...others].slice(0, MAX_SHOWN);
      }
      if (cancelled) return;
      setSameCategoryCount(sameCategory.length);
      setProducts(list);
    })().catch(() => {
      /* a missing "You may also like" row must never break the product page */
    });
    return () => {
      cancelled = true;
    };
  }, [storeSlug, categorySlug, currentProductId]);

  useEffect(() => {
    if (products.length === 0) return;
    getProductRatingSummaries(products.map((p) => p.id))
      .then(setRatings)
      .catch(() => {});
  }, [products]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    getAutoApplyCoupons(storeId)
      .then((list) => {
        if (!cancelled) setCoupons(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (products.length === 0) return null;

  const handleAddToCart = async (product: Product) => {
    setLoadingId(product.id);
    try {
      const item: AddToCartType = {
        productId: product.id,
        storeSlug,
        quantity: 1,
        variantId: product.variants?.[0]?.id || null,
      };
      addToCart(item);
      success(`${product.name} ${t.shop.addedToCart}`);
    } catch (err) {
      console.error(err);
      showError(t.shop.failedAddToCart);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="mt-10" aria-labelledby="related-products-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="related-products-title" className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
          {t.shop.youMayAlsoLike}
        </h2>
        <Link
          href={sameCategoryCount > 0 ? `/${storeSlug}/category/${categorySlug}` : `/${storeSlug}/shop`}
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          {t.shop.viewAll}
        </Link>
      </div>

      {/* Like the Shop page: 2 columns on phones (4 products), then one row of 4 / 5 / 6 on tablet, laptop, desktop. */}
      <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className={`h-full ${index === 4 ? "max-lg:hidden" : ""} ${index === 5 ? "max-xl:hidden" : ""}`}
          >
            <ProductCard
              product={product}
              store_slug={storeSlug}
              onAddToCart={() => handleAddToCart(product)}
              isLoading={loadingId === product.id}
              rating={ratings[product.id]}
              autoCoupons={coupons}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
