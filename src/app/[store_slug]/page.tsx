"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Package, Loader2, Sparkles, Tag } from "lucide-react";
import { getStoreBySlugFull, StoreFull } from "@/lib/queries/stores/getStoreBySlugFull";
import { getFeaturedProducts } from "@/lib/queries/products/getFeaturedProducts";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category";
import { StoreHomePageSkeleton } from "../components/skeletons/StoreHomePageSkeleton";
import NotFoundPage from "../not-found";
import useCartStore from "@/lib/store/cartStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { AddToCartType } from "@/lib/schema/checkoutSchema";

interface StoreHomePageProps {
  params: Promise<{ store_slug: string }>;
  store?: StoreFull;
}

export default function StoreHomePage({ params }: StoreHomePageProps) {
  const { store_slug } = React.use(params);
  const { success, error: showError } = useSheiNotification();
  const { addToCart } = useCartStore();

  const [storeData, setStoreData] = useState<StoreFull | null>(null);
  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      try {
        const fullStore = await getStoreBySlugFull(store_slug);
        if (!fullStore) { setStoreExists(false); return; }
        setStoreData(fullStore);
        setStoreExists(true);

        const [categoriesData, featured] = await Promise.all([
          getCategoriesQuery(fullStore.id),
          getFeaturedProducts(store_slug, 5),
        ]);

        if (categoriesData.data) setCategories(categoriesData.data);
        setFeaturedProducts(featured);
      } catch (err) {
        console.error(err);
        showError("Failed to load store data");
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store_slug]);

  const isProductInStock = (product: Product): boolean => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some((v) => {
        const inv = v.product_inventory?.[0];
        if (inv && inv.quantity_available > 0) return true;
        return (v.stock?.quantity_available ?? 0) > 0;
      });
    }
    const inv = product.product_inventory?.[0];
    if (inv && inv.quantity_available > 0) return true;
    return (product.stock?.quantity_available ?? 0) > 0;
  };

  const handleAddToCart = async (product: Product) => {
    if (!isProductInStock(product)) { showError("This product is out of stock"); return; }
    setLoadingProductId(product.id);
    try {
      const variant = product.variants?.[0];
      const cartProduct: AddToCartType = {
        productId: product.id,
        storeSlug: store_slug,
        quantity: 1,
        variantId: variant?.id || null,
      };
      addToCart(cartProduct);
      success(`${product.name} added to cart`);
    } catch (err) {
      console.error(err);
      showError("Failed to add product to cart");
    } finally {
      setLoadingProductId(null);
    }
  };

  if (loading) return <StoreHomePageSkeleton />;
  if (storeExists === false) return <NotFoundPage />;

  const storeName = (storeData?.store_name ?? store_slug.replace(/-/g, " ")).toUpperCase();
  const hasBanner = !!storeData?.banner_url;

  return (
    <div className="min-h-screen bg-[#F8F8F6] dark:bg-gray-950">

      {/* ══════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden">
        {hasBanner && (
          <div className="relative w-full h-72 sm:h-96 lg:h-120">
            <Image
              src={storeData!.banner_url!}
              alt={`${storeName} banner`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            {/* rich cinematic overlay */}
            <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/5 to-black/70" />
            {/* subtle vignette */}
            <div className="absolute inset-0 bg-linear-to-r from-black/20 via-transparent to-black/20" />
          </div>
        )}

        {/* Identity overlaid on banner */}
        {hasBanner && (
          <div className="absolute bottom-0 inset-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-7 flex items-end justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex items-center gap-3.5"
              >
                {storeData?.logo_url && (
                  <div className="shrink-0 w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-white/25 shadow-xl">
                    <Image src={storeData.logo_url} alt={storeName} width={56} height={56} className="object-cover w-full h-full" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-widest leading-none text-white drop-shadow-md">
                    {storeName}
                  </h1>
                  {storeData?.description && (
                    <p className="mt-1 text-xs text-white/60 line-clamp-1 max-w-xs font-medium">
                      {storeData.description}
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="shrink-0"
              >
                <Link
                  href={`/${store_slug}/shop`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm bg-white text-gray-900 shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-200"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Shop All
                </Link>
              </motion.div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          NO-BANNER IDENTITY HEADER
      ══════════════════════════════════════════ */}
      {!hasBanner && (
        <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38 }}
              className="flex items-center gap-4 min-w-0"
            >
              {storeData?.logo_url ? (
                <div className="shrink-0 w-13 h-13 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md">
                  <Image src={storeData.logo_url} alt={storeName} width={52} height={52} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="shrink-0 w-13 h-13 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black tracking-widest leading-none text-gray-900 dark:text-white truncate">
                  {storeName}
                </h1>
                {storeData?.description && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 max-w-sm">
                    {storeData.description}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: 0.07 }}
              className="shrink-0"
            >
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200"
              >
                <ShoppingBag className="h-4 w-4" />
                Shop All
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SHOP BY CATEGORY
      ══════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="bg-white dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-end justify-between mb-8 sm:mb-10"
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-1.5">
                  Browse Collection
                </p>
                <h2 className="text-2xl sm:text-[1.75rem] font-black text-gray-900 dark:text-white tracking-tight leading-none">
                  Shop by Category
                </h2>
              </div>
              <Link
                href={`/${store_slug}/shop`}
                className="group hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                View all
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </motion.div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {categories.slice(0, 6).map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  store_slug={store_slug}
                  index={i}
                />
              ))}
            </div>

            {/* Mobile view-all */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-7 text-center sm:hidden"
            >
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                View all categories
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          FEATURED PRODUCTS
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-16">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between mb-7 sm:mb-9"
        >
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-1.5">
              Hand-picked
            </p>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-[1.75rem] font-black text-gray-900 dark:text-white tracking-tight leading-none">
                Featured Picks
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <Sparkles className="h-3 w-3" />
                {featuredProducts.length}
              </span>
            </div>
          </div>
          <Link
            href={`/${store_slug}/shop`}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            See all
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </motion.div>

        {/* Empty state */}
        {featuredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No featured products yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 mb-6 max-w-50 leading-relaxed">
              Check the full shop for all available products.
            </p>
            <Link
              href={`/${store_slug}/shop`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-sm"
            >
              Browse all products
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Bento grid */}
        {featuredProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">

              {featuredProducts[0] && (
                <ProductCard
                  product={featuredProducts[0]}
                  store_slug={store_slug}
                  onAddToCart={handleAddToCart}
                  loadingProductId={loadingProductId}
                  isProductInStock={isProductInStock}
                  className="sm:col-span-2 sm:row-span-2"
                  imageClassName="aspect-[3/4] sm:h-full sm:min-h-[480px]"
                  isHero
                  index={0}
                />
              )}

              {featuredProducts.slice(1).map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  store_slug={store_slug}
                  onAddToCart={handleAddToCart}
                  loadingProductId={loadingProductId}
                  isProductInStock={isProductInStock}
                  className=""
                  imageClassName="aspect-square"
                  isHero={false}
                  index={i + 1}
                />
              ))}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-14 flex flex-col items-center gap-3"
            >
              <p className="text-xs text-gray-400 dark:text-gray-600 tracking-wide">
                Showing {featuredProducts.length} hand-picked products
              </p>
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:border-gray-800 dark:hover:border-gray-400 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-gray-900 active:scale-95 transition-all duration-250 group"
              >
                Browse all products
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </motion.div>
          </>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CATEGORY CARD
───────────────────────────────────────────────────────── */
interface CategoryCardProps {
  category: Category;
  store_slug: string;
  index: number;
}

function CategoryCard({ category, store_slug, index }: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.38, ease: "easeOut" }}
    >
      <Link
        href={`/${store_slug}/shop?category=${encodeURIComponent(category.name)}`}
        className="group flex flex-col items-center text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
      >
        {/* Top micro-accent line on hover */}
        <div className="w-full h-0.5 bg-linear-to-r from-transparent via-gray-200 to-transparent group-hover:via-gray-400 dark:group-hover:via-gray-500 transition-all duration-300" />

        <div className="flex flex-col items-center gap-3 px-3 py-6 sm:py-7 w-full">
          {/* Icon container */}
          <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
            <Tag className="h-4.5 w-4.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300" />
          </div>

          {/* Category name */}
          <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2 tracking-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200">
            {category.name}
          </p>

          {/* Browse CTA */}
          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all duration-300">
            Browse
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────────────────────── */
interface ProductCardProps {
  product: Product;
  store_slug: string;
  onAddToCart: (p: Product) => void;
  loadingProductId: string | null;
  isProductInStock: (p: Product) => boolean;
  className: string;
  imageClassName: string;
  isHero: boolean;
  index: number;
}

function ProductCard({
  product,
  store_slug,
  onAddToCart,
  loadingProductId,
  isProductInStock,
  className,
  imageClassName,
  isHero,
  index,
}: ProductCardProps) {
  const inStock = isProductInStock(product);
  const imageUrl = product.images?.[0] ?? product.primary_image?.image_url ?? null;
  const price = product.discounted_price ?? product.base_price;
  const hasDiscount =
    product.discounted_price != null && product.discounted_price < product.base_price;
  const discountPct = hasDiscount
    ? Math.round(((product.base_price - (product.discounted_price ?? 0)) / product.base_price) * 100)
    : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.38 }}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-350 ${className}`}
    >
      {/* Image */}
      <Link
        href={`/${store_slug}/product/${product.id}`}
        className={`relative block overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0 ${imageClassName}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
            sizes={isHero ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-gray-200 dark:text-gray-700" />
          </div>
        )}

        {/* Hero gradient scrim */}
        {isHero && (
          <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500 text-white shadow-sm tracking-wide">
              -{discountPct}%
            </span>
          )}
          {!inStock && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-900/80 backdrop-blur-sm text-white">
              Sold out
            </span>
          )}
        </div>

        {/* Hero: name + price inside image */}
        {isHero && (
          <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 z-10">
            <p className="text-white font-bold text-base sm:text-lg leading-snug line-clamp-2 drop-shadow-sm">
              {product.name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-white font-black text-sm sm:text-base drop-shadow">
                ৳{Number(price).toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-white/55 text-xs line-through font-medium">
                  ৳{Number(product.base_price).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desktop hover quick-add */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out p-3 hidden sm:block z-20">
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
            disabled={!inStock || loadingProductId === product.id}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/96 dark:bg-gray-900/96 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 transition-colors duration-150"
          >
            {loadingProductId === product.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <ShoppingBag className="h-3.5 w-3.5" />
            }
            {inStock ? "Quick Add" : "Out of Stock"}
          </button>
        </div>
      </Link>

      {/* Info — standard cards only */}
      {!isHero && (
        <div className="flex items-start justify-between gap-2 px-3.5 py-3">
          <div className="flex-1 min-w-0">
            <Link href={`/${store_slug}/product/${product.id}`}>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150">
                {product.name}
              </p>
            </Link>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-sm font-black text-gray-900 dark:text-white">
                ৳{Number(price).toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 line-through">
                  ৳{Number(product.base_price).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Mobile add button */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={!inStock || loadingProductId === product.id}
            aria-label={`Add ${product.name} to cart`}
            className="sm:hidden shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all duration-150 shadow-sm"
          >
            {loadingProductId === product.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <ShoppingBag className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      )}

      {/* Hero mobile add button */}
      {isHero && (
        <button
          onClick={() => onAddToCart(product)}
          disabled={!inStock || loadingProductId === product.id}
          aria-label={`Add ${product.name} to cart`}
          className="sm:hidden absolute bottom-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white text-gray-900 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all duration-150"
        >
          {loadingProductId === product.id
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ShoppingBag className="h-4 w-4" />
          }
        </button>
      )}
    </motion.article>
  );
}
