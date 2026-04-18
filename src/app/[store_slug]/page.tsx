"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Package, Loader2, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ══════════════════════════════════════════
          BANNER
      ══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden">
        {hasBanner ? (
          <div className="relative w-full h-64 sm:h-80 lg:h-110">
            <Image
              src={storeData!.banner_url!}
              alt={`${storeName} banner`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/55" />
          </div>
        ) : null}

        {/* Store identity — overlaid on banner bottom when banner exists */}
        {hasBanner && (
          <div className="absolute bottom-0 inset-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 flex items-end justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38 }}
                className="flex items-center gap-3"
              >
                {storeData?.logo_url && (
                  <div className="shrink-0 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
                    <Image src={storeData.logo_url} alt={storeName} width={52} height={52} className="object-cover" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-widest leading-none text-white drop-shadow">
                    {storeName}
                  </h1>
                  {storeData?.description && (
                    <p className="mt-0.5 text-xs line-clamp-1 max-w-xs text-white/65">
                      {storeData.description}
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.38, delay: 0.08 }}
                className="shrink-0"
              >
                <Link
                  href={`/${store_slug}/shop`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-all shadow-md bg-white text-gray-900 hover:bg-gray-100"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Shop All
                </Link>
              </motion.div>
            </div>
          </div>
        )}
      </section>

      {/* ── No-banner identity strip ── */}
      {!hasBanner && (
        <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-3 min-w-0"
            >
              {storeData?.logo_url && (
                <div className="shrink-0 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                  <Image src={storeData.logo_url} alt={storeName} width={48} height={48} className="object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black tracking-widest leading-none text-gray-900 dark:text-white truncate">
                  {storeName}
                </h1>
                {storeData?.description && (
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 max-w-sm">
                    {storeData.description}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.07 }}
              className="shrink-0"
            >
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-all shadow-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100"
              >
                <ShoppingBag className="h-4 w-4" />
                Shop All
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CATEGORY TABS
      ══════════════════════════════════════════ */}
      {categories.length > 0 && (
        <div className="border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center overflow-x-auto scrollbar-hide">
              <Link
                href={`/${store_slug}/shop`}
                className="shrink-0 px-5 py-3.5 text-xs font-bold text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white whitespace-nowrap"
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${store_slug}/shop?category=${encodeURIComponent(cat.name)}`}
                  className="shrink-0 px-5 py-3.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 whitespace-nowrap transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          FEATURED — 5 products, editorial bento
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">

        {/* Label row */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Featured picks
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">
              · {featuredProducts.length} items
            </span>
          </div>
          <Link
            href={`/${store_slug}/shop`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
          >
            See all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ── EMPTY STATE ── */}
        {featuredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No featured products yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 mb-5">Check the full shop for all available products.</p>
            <Link
              href={`/${store_slug}/shop`}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
            >
              Browse all products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* ── BENTO GRID (5 products) ── */}
        {featuredProducts.length > 0 && (
          <>
            {/*
              Desktop layout (lg):
                [  hero (col 1–2, row 1–2)  ] [ card2 (col 3) ] [ card3 (col 4) ]
                                               [ card4 (col 3) ] [ card5 (col 4) ]

              Tablet (sm):
                [  hero (col 1–2)  ] [ card2 ] [ card3 ]
                [ card4 ] [ card5  ]  (row 2 fills)

              Mobile: single column stack
            */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">

              {/* ── CARD 1 — BIG HERO ── */}
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

              {/* ── CARDS 2–5 — STANDARD ── */}
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

            {/* ── BOTTOM CTA ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-12 flex flex-col items-center gap-2"
            >
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Showing {featuredProducts.length} hand-picked products
              </p>
              <Link
                href={`/${store_slug}/shop`}
                className="mt-1 inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:border-gray-900 dark:hover:border-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all"
              >
                Browse all products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PRODUCT CARD  — shared between hero + standard slots
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
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${className}`}
    >
      {/* ── Image ── */}
      <Link
        href={`/${store_slug}/product/${product.id}`}
        className={`relative block overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0 ${imageClassName}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
            sizes={isHero ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-gray-200 dark:text-gray-700" />
          </div>
        )}

        {/* Gradient scrim at bottom of image for text legibility on hero */}
        {isHero && (
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
              -{discountPct}%
            </span>
          )}
          {!inStock && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900/80 text-white">
              Sold out
            </span>
          )}
        </div>

        {/* Hero: price + name inside image */}
        {isHero && (
          <div className="absolute bottom-0 inset-x-0 p-4 z-10">
            <p className="text-white font-bold text-base sm:text-lg leading-snug line-clamp-2 drop-shadow">
              {product.name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-white font-black text-sm sm:text-base drop-shadow">
                ৳{Number(price).toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-white/60 text-xs line-through">
                  ৳{Number(product.base_price).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desktop hover quick-add */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-3 hidden sm:block z-20">
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
            disabled={!inStock || loadingProductId === product.id}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-900 transition-colors"
          >
            {loadingProductId === product.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <ShoppingBag className="h-3.5 w-3.5" />
            }
            {inStock ? "Quick Add" : "Out of Stock"}
          </button>
        </div>
      </Link>

      {/* ── Info (standard cards only — hero shows inside image) ── */}
      {!isHero && (
        <div className="flex items-start justify-between gap-2 p-3">
          <div className="flex-1 min-w-0">
            <Link href={`/${store_slug}/product/${product.id}`}>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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

          {/* Mobile add */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={!inStock || loadingProductId === product.id}
            aria-label={`Add ${product.name} to cart`}
            className="sm:hidden shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all"
          >
            {loadingProductId === product.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <ShoppingBag className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      )}

      {/* Hero mobile add button — floats over image */}
      {isHero && (
        <button
          onClick={() => onAddToCart(product)}
          disabled={!inStock || loadingProductId === product.id}
          aria-label={`Add ${product.name} to cart`}
          className="sm:hidden absolute bottom-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-xl bg-white text-gray-900 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all"
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
