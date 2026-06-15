"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Package, Loader2, Sparkles, Tag } from "lucide-react";
import { getStoreBySlugFull, StoreFull } from "@/lib/queries/stores/getStoreBySlugFull";
import { getFeaturedProducts } from "@/lib/queries/products/getFeaturedProducts";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category";
import { StoreHomePageSkeleton } from "../components/skeletons/StoreHomePageSkeleton";
import NotFoundPage from "../not-found";
import useCartStore from "@/lib/store/cartStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface StoreHomePageProps {
  params: Promise<{ store_slug: string }>;
  store?: StoreFull;
}

export default function StoreHomePage({ params }: StoreHomePageProps) {
  const { store_slug } = React.use(params);
  const { success, error: showError } = useSheiNotification();
  const { addToCart } = useCartStore();
  const t = useTranslation();
  const n = useLocalNum();

  const [storeData, setStoreData] = useState<StoreFull | null>(null);
  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isFeaturedSection, setIsFeaturedSection] = useState(true);
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

        if (featured.length > 0) {
          setFeaturedProducts(featured);
          setIsFeaturedSection(true);
        } else {
          const latest = await clientGetProducts(store_slug, 1, 5);
          setFeaturedProducts(latest.products);
          setIsFeaturedSection(false);
        }
      } catch (err) {
        console.error(err);
        showError(t.home.failedStore);
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
    if (!isProductInStock(product)) { showError(t.home.outOfStockError); return; }
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
      success(`${product.name} ${t.home.addedToCart}`);
    } catch (err) {
      console.error(err);
      showError(t.home.failedAddToCart);
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
          HERO — compact on mobile (h-36), full on desktop
      ══════════════════════════════════════════ */}
      <section className="relative w-full">
        {hasBanner && (
          <div className="relative w-full h-36 sm:h-96 lg:h-120 overflow-hidden">
            <Image
              src={storeData!.banner_url!}
              alt={`${storeName} banner`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/5 to-black/70" />
            <div className="absolute inset-0 bg-linear-to-r from-black/20 via-transparent to-black/20" />
          </div>
        )}

        {hasBanner && (
          <div className="absolute bottom-0 inset-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2.5 sm:pb-7 flex items-end justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex items-center gap-2 sm:gap-3.5"
              >
                {storeData?.logo_url && (
                  <div className="shrink-0 w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-white/25 shadow-xl">
                    <Image src={storeData.logo_url} alt={storeName} width={56} height={56} className="object-cover w-full h-full" />
                  </div>
                )}
                <div>
                  <h1 className="text-sm sm:text-2xl font-black tracking-widest leading-none text-white drop-shadow-md">
                    {storeName}
                  </h1>
                  {storeData?.description && (
                    <p className="hidden sm:block mt-1 text-xs text-white/60 line-clamp-1 max-w-xs font-medium">
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
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm bg-white text-gray-900 shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-200"
                >
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t.home.shopAll}</span>
                  <span className="sm:hidden">{t.home.shop}</span>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-7 flex items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38 }}
              className="flex items-center gap-3 sm:gap-4 min-w-0"
            >
              {storeData?.logo_url ? (
                <div className="shrink-0 w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md">
                  <Image src={storeData.logo_url} alt={storeName} width={52} height={52} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="shrink-0 w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black tracking-widest leading-none text-gray-900 dark:text-white truncate">
                  {storeName}
                </h1>
                {storeData?.description && (
                  <p className="hidden sm:block mt-1 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 max-w-sm">
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
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm hover:bg-gray-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200"
              >
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t.home.shopAll}</span>
                <span className="sm:hidden">{t.home.shop}</span>
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      

      {/* ══════════════════════════════════════════
          FEATURED PRODUCTS — bento grid on all screens
      ══════════════════════════════════════════ */}
      <section className="pt-4 sm:pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between mb-3 sm:mb-9"
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-1 sm:mb-1.5">
                {isFeaturedSection ? t.home.handPicked : t.home.explore}
              </p>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <h2 className="text-lg sm:text-[1.75rem] font-black text-gray-900 dark:text-white tracking-tight leading-none">
                  {isFeaturedSection ? t.home.featuredPicks : t.home.ourCollection}
                </h2>
                {isFeaturedSection && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {featuredProducts.length}
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/${store_slug}/shop`}
              className="group inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              {t.home.seeAll}
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </motion.div>

          {/* Bento grid — 2 cols mobile, 4 cols desktop */}
          {featuredProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">
              {featuredProducts[0] && (
                <ProductCard
                  product={featuredProducts[0]}
                  store_slug={store_slug}
                  onAddToCart={handleAddToCart}
                  loadingProductId={loadingProductId}
                  isProductInStock={isProductInStock}
                  className="sm:col-span-2 sm:row-span-2"
                  imageClassName="aspect-3/4 sm:h-full sm:min-h-120"
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
          )}

          {/* Bottom CTA */}
          {featuredProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 sm:mt-14 flex flex-col items-center gap-3"
            >
              <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-600 tracking-wide">
                {[t.home.showingPrefix, n(featuredProducts.length) + t.home.showingSuffix].filter(s => s.trim()).join(" ")}
              </p>
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:border-gray-800 dark:hover:border-gray-400 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-gray-900 active:scale-95 transition-all duration-200 group"
              >
                {t.home.browseAll}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </motion.div>
          )}
        </div>
      </section>
      {/* ══════════════════════════════════════════
          MOBILE — category chip strip
          Sits immediately below the hero / header,
          visible only on mobile (<sm)
      ══════════════════════════════════════════ */}
      {categories.length > 0 && (
        <div className="sm:hidden pt-3 pb-1">
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map((cat, i) => (
              <CategoryChip key={cat.id} category={cat} store_slug={store_slug} index={i} />
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(categories.length * 0.05, 0.4), duration: 0.28 }}
              className="shrink-0"
            >
              <Link
                href={`/${store_slug}/shop`}
                className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all duration-150"
              >
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DESKTOP — full category card section
          Hidden on mobile, shown on sm+
      ══════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="hidden sm:block bg-white dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-1.5">
                  {t.home.browseCollection}
                </p>
                <h2 className="text-[1.75rem] font-black text-gray-900 dark:text-white tracking-tight leading-none">
                  {t.home.shopByCategory}
                </h2>
              </div>
              <Link
                href={`/${store_slug}/shop`}
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                {t.home.viewAll}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} store_slug={store_slug} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CATEGORY CHIP — mobile pill strip
───────────────────────────────────────────────────────── */
interface CategoryChipProps {
  category: Category;
  store_slug: string;
  index: number;
}

function CategoryChip({ category, store_slug, index }: CategoryChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.28, ease: "easeOut" }}
      className="shrink-0"
    >
      <Link
        href={`/${store_slug}/shop?category=${encodeURIComponent(category.name)}`}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 whitespace-nowrap"
      >
        <Tag className="h-3 w-3 text-gray-400 shrink-0" />
        {category.name}
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   CATEGORY CARD — desktop grid
───────────────────────────────────────────────────────── */
interface CategoryCardProps {
  category: Category;
  store_slug: string;
  index: number;
}

function CategoryCard({ category, store_slug, index }: CategoryCardProps) {
  const t = useTranslation();
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
        <div className="w-full h-0.5 bg-linear-to-r from-transparent via-gray-200 to-transparent group-hover:via-gray-400 dark:group-hover:via-gray-500 transition-all duration-300" />
        <div className="flex flex-col items-center gap-3 px-3 py-7 w-full">
          <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
            <Tag className="h-4.5 w-4.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300" />
          </div>
          <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2 tracking-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200">
            {category.name}
          </p>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all duration-300">
            {t.home.browse}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   PRODUCT CARD — bento grid (all screen sizes)
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
  const t = useTranslation();
  const n = useLocalNum();
  const inStock = isProductInStock(product);
  const imageUrl = product.images?.[0] ?? product.primary_image?.image_url ?? null;

  const firstVariant = product.variants?.[0];
  const originalPrice = firstVariant?.base_price ?? product.base_price;
  const price =
    firstVariant?.discounted_price && firstVariant.discounted_price > 0
      ? firstVariant.discounted_price
      : (firstVariant?.base_price ?? product.discounted_price ?? product.base_price);
  const hasDiscount = originalPrice > price;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.38 }}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-350 ${className}`}
    >
      <Link
        href={`/${store_slug}/product/${product.slug}`}
        className={`relative block overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0 ${imageClassName}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
            sizes={isHero ? "50vw" : "25vw"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-gray-200 dark:text-gray-700" />
          </div>
        )}

        {isHero && (
          <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500 text-white shadow-sm tracking-wide">
              -{n(discountPct)}%
            </span>
          )}
          {!inStock && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-900/80 backdrop-blur-sm text-white">
              {t.home.soldOut}
            </span>
          )}
        </div>

        {isHero && (
          <div className="absolute bottom-0 inset-x-0 p-5 z-10">
            <p className="text-white font-bold text-lg leading-snug line-clamp-2 drop-shadow-sm">
              {product.name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-white font-black text-base drop-shadow">
                ৳{n(Number(price).toLocaleString())}
              </span>
              {hasDiscount && (
                <span className="text-white/55 text-xs line-through font-medium">
                  ৳{n(Number(originalPrice).toLocaleString())}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Hover quick-add overlay — desktop only */}
        <div className="hidden sm:block absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out p-3 z-20">
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
            disabled={!inStock || loadingProductId === product.id}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/96 dark:bg-gray-900/96 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 transition-colors duration-150"
          >
            {loadingProductId === product.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <ShoppingBag className="h-3.5 w-3.5" />
            }
            {inStock ? t.home.quickAdd : t.home.outOfStock}
          </button>
        </div>
      </Link>

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
                ৳{n(Number(price).toLocaleString())}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 line-through">
                  ৳{n(Number(originalPrice).toLocaleString())}
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
