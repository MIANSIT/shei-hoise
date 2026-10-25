import { getStoreBySlugFull, type StoreFull } from "@/lib/queries/stores/getStoreBySlugFull";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import { getFeaturedProducts } from "@/lib/queries/products/getFeaturedProducts";
import { getActiveFlashSaleProducts } from "@/lib/queries/products/getActiveFlashSaleProducts";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getStorefrontBundles } from "@/lib/queries/bundles/getStorefrontBundles";
import { getActiveHeroSlides } from "@/lib/queries/storefront/heroSlides/getActiveHeroSlides";
import { getStorefrontCoupons } from "@/lib/queries/coupons/getStorefrontCoupons";
import { getActivePromoBanners } from "@/lib/queries/storefront/promoBanners/getActivePromoBanners";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { getStoreRatingSummary } from "@/lib/queries/storeReviews/getStoreRatingSummary";
import { getStorefrontBrands } from "@/lib/queries/brands/getStorefrontBrands";
import type { Product } from "@/lib/types/product";
import type { Category } from "@/lib/types/category";
import type { Coupon } from "@/lib/types/coupon";
import type { HeroSlide } from "@/lib/types/heroSlide";
import type { PromoBanner } from "@/lib/types/promoBanner";
import type { StorefrontBrand } from "@/lib/types/brand";
import type { StoreSettings } from "@/lib/types/store/store";

export interface StoreHomeData {
  store: StoreFull;
  settings: StoreSettings | null;
  categories: Category[];
  brands: StorefrontBrand[];
  bundles: Product[];
  flashSaleProducts: Product[];
  ratingSummary: { average: number; total: number };
  heroSlides: HeroSlide[];
  coupons: Coupon[];
  promoBanners: PromoBanner[];
  featuredProducts: Product[];
  /** false when the store has no featured products and `featuredProducts` is the newest stock instead. */
  isFeaturedSection: boolean;
}

/**
 * Everything the store home page renders, loaded on the server so the first
 * HTML response already contains the store's name, description, categories
 * and products — crawlers and link previews don't run the client fetch.
 * @returns the page data, or null when the slug matches no store
 */
export async function getStoreHomeData(storeSlug: string): Promise<StoreHomeData | null> {
  const store = await getStoreBySlugFull(storeSlug);
  if (!store) return null;

  const [categories, brands, featured, bundles, settings, flashSaleProducts, ratingSummary, heroSlides, liveCoupons, promoBanners] =
    await Promise.all([
      getCategoriesQuery(store.id),
      getStorefrontBrands(storeSlug),
      getFeaturedProducts(storeSlug, 5),
      getStorefrontBundles(storeSlug, 4),
      getStoreSettings(store.id),
      getActiveFlashSaleProducts(storeSlug, 8),
      getStoreRatingSummary(store.id),
      getActiveHeroSlides(store.id),
      getStorefrontCoupons(store.id),
      getActivePromoBanners(store.id),
    ]);

  // Explicitly newest — this block is the fallback for a store with no
  // featured products, so it should surface recent stock rather than the top
  // of the shop's own A–Z/dragged order.
  const featuredProducts =
    featured.length > 0
      ? featured
      : (await clientGetProducts(storeSlug, 1, 5, undefined, undefined, "newest")).products;

  return {
    store,
    settings,
    categories: categories.data ?? [],
    brands,
    bundles,
    flashSaleProducts,
    ratingSummary,
    heroSlides,
    // The strip rotates through these — capped so a store with many coupons
    // doesn't turn the homepage banner into an endless loop.
    coupons: liveCoupons.slice(0, 5),
    promoBanners,
    featuredProducts,
    isFeaturedSection: featured.length > 0,
  };
}
