"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Package, Loader2, Sparkles, Tag, Truck, RefreshCw, ShieldCheck, Wallet, BadgeCheck } from "lucide-react";
import { getStoreBySlugFull, StoreFull } from "@/lib/queries/stores/getStoreBySlugFull";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getFeaturedProducts } from "@/lib/queries/products/getFeaturedProducts";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getStorefrontBundles } from "@/lib/queries/bundles/getStorefrontBundles";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category";
import { StoreSettings } from "@/lib/types/store/store";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { StoreHomePageSkeleton } from "../components/skeletons/StoreHomePageSkeleton";
import NotFoundPage from "../not-found";
import useCartStore from "@/lib/store/cartStore";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface StoreHomePageProps {
  params: Promise<{ store_slug: string }>;
}

export default function StoreHomePage({ params }: StoreHomePageProps) {
  const { store_slug } = React.use(params);
  const { success, error: showError } = useSheiNotification();
  const { addToCart } = useCartStore();
  const t = useTranslation();
  const n = useLocalNum();

  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const curr = currencyLoading ? "৳" : (currencyIcon ?? "৳");

  const [storeData, setStoreData] = useState<StoreFull | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isFeaturedSection, setIsFeaturedSection] = useState(true);
  const [bundles, setBundles] = useState<Product[]>([]);
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

        const [categoriesData, featured, storefrontBundles, settings] = await Promise.all([
          getCategoriesQuery(fullStore.id),
          getFeaturedProducts(store_slug, 5),
          getStorefrontBundles(store_slug, 4),
          getStoreSettings(fullStore.id),
        ]);

        if (categoriesData.data) setCategories(categoriesData.data);
        setBundles(storefrontBundles);
        setStoreSettings(settings);

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

  const showFreeDelivery =
    !!storeSettings?.free_shipping_threshold && storeSettings.free_shipping_threshold > 0;
  const showEasyReturns =
    !!storeSettings?.return_policy_days && storeSettings.return_policy_days > 0;
  // Only treat it as a deliberate "no returns" policy when the store has
  // explicitly set 0 — an unconfigured (null) field just means the store
  // hasn't filled this in yet, not that returns are refused.
  const showNoReturn = storeSettings?.return_policy_days === 0;

  return (
    <div className="min-h-screen bg-[#F8F8F6] dark:bg-gray-950">

      {/* ══════════════════════════════════════════
          HERO — compact on mobile (h-36), full on desktop
      ══════════════════════════════════════════ */}
      <section className="relative w-full">
        {hasBanner && (
          /* Mobile: fixed h-40 | Tablet sm: h-52 | Desktop md+: true 16:4 via aspectRatio */
          <div
            className="relative w-full h-40 sm:h-52 md:h-auto overflow-hidden"
            style={{ aspectRatio: '4 / 1' } as React.CSSProperties}
          >
            <Image
              src={storeData!.banner_url!}
              alt={`${storeName} banner`}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/5 to-black/70" />
            <div className="absolute inset-0 bg-linear-to-r from-black/20 via-transparent to-black/20" />
          </div>
        )}

        {hasBanner && (
          <div className="absolute bottom-0 inset-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 sm:pb-6 flex items-end justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1"
              >
                {storeData?.logo_url && (
                  <div className="shrink-0 w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
                    <Image src={storeData.logo_url} alt={storeName} width={56} height={56} className="object-cover w-full h-full" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-2xl font-black tracking-widest leading-none text-white drop-shadow-md truncate">
                    {storeName}
                  </h1>
                  {storeData?.short_description && (
                    <p className="mt-0.5 sm:mt-1.5 text-[11px] sm:text-sm text-white/80 truncate sm:whitespace-normal sm:line-clamp-2 font-normal leading-snug drop-shadow-sm max-w-xs sm:max-w-md md:max-w-xl">
                      {storeData.short_description}
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
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm bg-white text-stone-900 shadow-lg hover:bg-stone-50 dark:bg-gray-900/90 dark:text-white dark:backdrop-blur-sm dark:hover:bg-gray-800 active:scale-95 transition-all duration-200"
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
          NO-BANNER HERO — landing-page style: centered
          identity, soft ambient color blobs, full description
      ══════════════════════════════════════════ */}
      {!hasBanner && (
        <div className="relative overflow-hidden bg-white dark:bg-gray-950">
          {/* Ambient decoration — subtle, not a solid color block */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-100/50 dark:bg-emerald-500/10 blur-3xl" />
            <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-100/40 dark:bg-amber-500/10 blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {storeData?.logo_url ? (
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-stone-100 dark:border-gray-800 shadow-lg">
                  <Image src={storeData.logo_url} alt={storeName} width={80} height={80} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                  <ShoppingBag className="h-7 w-7 sm:h-8 sm:w-8 text-stone-400" />
                </div>
              )}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.06 }}
              className="mt-5 sm:mt-7 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05] text-stone-900 dark:text-white"
            >
              {storeName}
            </motion.h1>

            {(storeData?.description || storeData?.short_description) && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.12 }}
                className="mt-3 sm:mt-4 text-sm sm:text-base text-stone-500 dark:text-gray-400 leading-relaxed max-w-xl"
              >
                {storeData.description || storeData.short_description}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.18 }}
              className="mt-7 sm:mt-9"
            >
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-base bg-stone-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:bg-stone-700 dark:hover:bg-gray-100 active:scale-95 transition-all duration-200"
              >
                <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                {t.home.shopAll}
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      <TrustStrip
        showFreeDelivery={showFreeDelivery}
        showEasyReturns={showEasyReturns}
        showNoReturn={showNoReturn}
        freeShippingThreshold={storeSettings?.free_shipping_threshold}
        returnPolicyDays={storeSettings?.return_policy_days}
        currency={curr}
      />

      {/* ══════════════════════════════════════════
          BUNDLES & COMBOS — leads right after the trust strip:
          the strongest deal first. Independent of the Featured
          flag below, distinguished by an accent badge rather
          than a background color swap.
      ══════════════════════════════════════════ */}
      {bundles.length > 0 && (
        <section className="pt-8 sm:pt-16 pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow={t.home.bundleEyebrow}
              title={t.home.bundleDeals}
              href={`/${store_slug}/shop`}
              ctaLabel={t.home.seeAll}
              badge={
                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {bundles.length}
                </span>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {bundles.map((bundle, i) => (
                <ProductCard
                  key={bundle.id}
                  product={bundle}
                  store_slug={store_slug}
                  onAddToCart={handleAddToCart}
                  loadingProductId={loadingProductId}
                  isProductInStock={isProductInStock}
                  className=""
                  imageClassName="aspect-square"
                  isHero={false}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          FEATURED PRODUCTS — bento grid on all screens
      ══════════════════════════════════════════ */}
      <section className={`${bundles.length > 0 ? "border-t border-stone-100 dark:border-gray-800/60 pt-10 sm:pt-16" : "pt-8 sm:pt-16"} pb-16 sm:pb-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <SectionHeader
            eyebrow={isFeaturedSection ? t.home.handPicked : t.home.explore}
            title={isFeaturedSection ? t.home.featuredPicks : t.home.ourCollection}
            href={`/${store_slug}/shop`}
            ctaLabel={t.home.seeAll}
            badge={
              isFeaturedSection ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {featuredProducts.length}
                </span>
              ) : undefined
            }
          />

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
              <p className="hidden sm:block text-xs text-stone-400 dark:text-gray-600 tracking-wide">
                {[t.home.showingPrefix, n(featuredProducts.length) + t.home.showingSuffix].filter(s => s.trim()).join(" ")}
              </p>
              <Link
                href={`/${store_slug}/shop`}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full border-2 border-stone-200 dark:border-gray-700 text-stone-700 dark:text-gray-300 font-bold text-sm hover:border-stone-800 dark:hover:border-gray-400 hover:bg-stone-900 dark:hover:bg-white hover:text-white dark:hover:text-gray-900 active:scale-95 transition-all duration-200 group"
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
                className="flex items-center gap-1 px-3.5 py-2 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all duration-150"
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
        <section className="hidden sm:block border-t border-stone-100 dark:border-gray-800/60 pt-16 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow={t.home.browseCollection}
              title={t.home.shopByCategory}
              href={`/${store_slug}/shop`}
              ctaLabel={t.home.viewAll}
            />

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
   SECTION HEADER — eyebrow + title + optional badge + CTA link,
   the one repeated pattern every homepage section shares. Kept as a
   single component so sections read as one consistent design system
   instead of independently-styled blocks.
───────────────────────────────────────────────────────── */
interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  href: string;
  ctaLabel: string;
  badge?: React.ReactNode;
}

function SectionHeader({ eyebrow, title, href, ctaLabel, badge }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between mb-5 sm:mb-9"
    >
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-stone-400 dark:text-gray-500 mb-1 sm:mb-1.5">
          {eyebrow}
        </p>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h2 className="text-lg sm:text-[1.75rem] font-black text-stone-900 dark:text-white tracking-tight leading-none">
            {title}
          </h2>
          {badge}
        </div>
      </div>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-200"
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRUST STRIP — compact value-prop row right under the hero.
   Always renders a full, balanced set of four badges — delivery,
   returns/payment, quality, and security — instead of shrinking
   to whatever a store happened to configure. Store-specific
   settings (free shipping threshold, return window) upgrade the
   generic copy into something concrete when they're set; when
   they aren't, a universal fallback fills the slot instead of
   leaving a sparse, half-empty strip.
───────────────────────────────────────────────────────── */
interface TrustStripProps {
  showFreeDelivery: boolean;
  showEasyReturns: boolean;
  showNoReturn: boolean;
  freeShippingThreshold?: number | null;
  returnPolicyDays?: number | null;
  currency: React.ReactNode;
}

function TrustStrip({
  showFreeDelivery,
  showEasyReturns,
  showNoReturn,
  freeShippingThreshold,
  returnPolicyDays,
  currency,
}: TrustStripProps) {
  const t = useTranslation();
  const n = useLocalNum();

  const items: { icon: React.ReactNode; title: string; sub: string }[] = [];

  // Slot 1 — delivery: concrete free-shipping threshold if configured,
  // otherwise a generic (but still true, for every store) delivery signal.
  items.push(
    showFreeDelivery
      ? {
          icon: <Truck className="h-4 w-4" />,
          title: t.product.freeDelivery,
          sub: `${t.product.ordersOver} ${currency}${n(freeShippingThreshold!)}`,
        }
      : {
          icon: <Truck className="h-4 w-4" />,
          title: t.home.trustFastDelivery,
          sub: t.home.trustNationwide,
        }
  );

  // Slot 2 — returns if the store configured a real window, "all sales
  // final" only when that's an explicit deliberate choice (0, not unset),
  // otherwise Cash on Delivery — the universal trust signal in this market.
  if (showEasyReturns) {
    items.push({
      icon: <RefreshCw className="h-4 w-4" />,
      title: t.product.easyReturns,
      sub: `${t.product.within} ${n(returnPolicyDays!)} ${returnPolicyDays! > 1 ? t.product.days : t.product.day}`,
    });
  } else if (showNoReturn) {
    items.push({
      icon: <RefreshCw className="h-4 w-4" />,
      title: t.product.noReturns,
      sub: t.product.allSalesFinal,
    });
  } else {
    items.push({
      icon: <Wallet className="h-4 w-4" />,
      title: t.home.trustCod,
      sub: t.home.trustPayOnArrival,
    });
  }

  // Slot 3 — quality, always shown.
  items.push({
    icon: <BadgeCheck className="h-4 w-4" />,
    title: t.home.trustGenuine,
    sub: t.home.trustQualityChecked,
  });

  // Slot 4 — payment security, always shown.
  items.push({
    icon: <ShieldCheck className="h-4 w-4" />,
    title: t.product.securePayment,
    sub: t.product.hundredProtected,
  });

  return (
    <div className="bg-white dark:bg-gray-900/40 border-b border-stone-100 dark:border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="min-w-0 flex flex-col items-center text-center gap-1.5 sm:gap-2"
            >
              <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-stone-50 dark:bg-gray-800 text-stone-500 dark:text-gray-400 shrink-0">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-bold text-stone-900 dark:text-white leading-snug">
                  {item.title}
                </p>
                <p className="text-[10px] sm:text-[11px] text-stone-400 dark:text-gray-500 leading-snug">
                  {item.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
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
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-gray-900 border border-stone-100 dark:border-gray-700 shadow-sm text-[11px] font-bold text-stone-700 dark:text-gray-200 hover:bg-stone-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 whitespace-nowrap"
      >
        <Tag className="h-3 w-3 text-stone-400 shrink-0" />
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
        className="group flex flex-col items-center text-center rounded-2xl bg-white dark:bg-gray-900 border border-stone-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden"
      >
        <div className="w-full h-0.5 bg-linear-to-r from-transparent via-stone-200 to-transparent group-hover:via-stone-400 dark:group-hover:via-gray-500 transition-all duration-300" />
        <div className="flex flex-col items-center gap-3 px-3 py-7 w-full">
          <div className="w-11 h-11 rounded-xl bg-stone-50 dark:bg-gray-800 border border-stone-100 dark:border-gray-700 flex items-center justify-center shrink-0 group-hover:bg-stone-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
            <Tag className="h-4.5 w-4.5 text-stone-400 dark:text-gray-500 group-hover:text-stone-600 dark:group-hover:text-gray-300 transition-colors duration-300" />
          </div>
          <p className="text-[13px] font-bold text-stone-800 dark:text-gray-100 leading-snug line-clamp-2 tracking-tight group-hover:text-stone-900 dark:group-hover:text-white transition-colors duration-200">
            {category.name}
          </p>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 dark:text-gray-500 group-hover:text-stone-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all duration-300">
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
  const bundleSavings =
    product.product_type === "bundle" && (product.component_value ?? 0) > price
      ? product.component_value! - price
      : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.38 }}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-stone-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${className}`}
    >
      <Link
        href={`/${store_slug}/product/${product.slug}`}
        className={`relative block overflow-hidden bg-stone-50 dark:bg-gray-800 shrink-0 ${imageClassName}`}
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
            <Package className="h-10 w-10 text-stone-200 dark:text-gray-700" />
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
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-sm text-white">
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
            {bundleSavings > 0 && (
              <p className="mt-1 text-[11px] font-bold text-emerald-300 drop-shadow-sm">
                Save ৳{n(Number(bundleSavings).toLocaleString())} vs. buying separately
              </p>
            )}
          </div>
        )}

        {/* Hover quick-add overlay — desktop only */}
        <div className="hidden sm:block absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out p-3 z-20">
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
            disabled={!inStock || loadingProductId === product.id}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/96 dark:bg-gray-900/96 backdrop-blur-sm text-stone-900 dark:text-white text-xs font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 transition-colors duration-150"
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
            <Link href={`/${store_slug}/product/${product.slug}`}>
              <p className="text-[13px] font-semibold text-stone-800 dark:text-gray-100 line-clamp-2 leading-snug hover:text-stone-600 dark:hover:text-gray-300 transition-colors duration-150">
                {product.name}
              </p>
            </Link>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-sm font-black text-stone-900 dark:text-white">
                ৳{n(Number(price).toLocaleString())}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-stone-400 dark:text-gray-500 line-through">
                  ৳{n(Number(originalPrice).toLocaleString())}
                </span>
              )}
            </div>
            {bundleSavings > 0 && (
              <p className="mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Save ৳{n(Number(bundleSavings).toLocaleString())} separately
              </p>
            )}
          </div>

          {/* Mobile add button */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={!inStock || loadingProductId === product.id}
            aria-label={`Add ${product.name} to cart`}
            className="sm:hidden shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all duration-150 shadow-sm"
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
          className="sm:hidden absolute bottom-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white text-stone-900 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all duration-150"
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
