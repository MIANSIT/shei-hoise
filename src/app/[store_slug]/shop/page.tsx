"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../../components/products/ProductGrid";
import ProductFilterSection, { ShopFilterSidebar } from "@/app/components/products/ProductFilterSection";
import type { ShopFilterValues } from "@/app/components/products/ShopFilterPanel";
import { StorePageSkeleton } from "../../components/skeletons/StorePageSkeleton";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import {
  clientGetProducts,
  type ProductSortOption,
} from "@/lib/queries/products/clientGetProducts";
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category";
import type { StorefrontBrand } from "@/lib/types/brand";
import { getStorefrontBrands } from "@/lib/queries/brands/getStorefrontBrands";
import NotFoundPage from "../../not-found";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { Loader2 } from "lucide-react";
import { m } from "framer-motion";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { fbq, FbEvent } from "@/lib/utils/fbPixel";

interface ShopPageProps {
  params: Promise<{ store_slug: string }>;
}

const SORT_OPTIONS: ProductSortOption[] = [
  "default",
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
];

/** "a,b,c" from the URL (?category= / ?brand=) to a de-duplicated list of slugs. */
function parseListParam(value: string | null): string[] {
  if (!value) return [];
  return Array.from(new Set(value.split(",").map((v) => v.trim()).filter(Boolean)));
}

const sameList = (a: string[], b: string[]) => a.join(",") === b.join(",");

/** ?min= / ?max= to a clean whole-taka string ("" when missing or not a number). */
function parsePriceParam(value: string | null): string {
  return value && /^\d{1,9}$/.test(value) ? String(Number(value)) : "";
}

/** The query's price range from the two filter strings; an empty side stays open. */
function toPriceRange(min: string, max: string): { min?: number; max?: number } | undefined {
  if (!min && !max) return undefined;
  return {
    ...(min ? { min: Number(min) } : {}),
    ...(max ? { max: Number(max) } : {}),
  };
}

/** Guards the ?sort= param — anything unrecognised falls back to the default. */
function parseSortParam(value: string | null): ProductSortOption {
  return SORT_OPTIONS.find((o) => o === value) ?? "default";
}

export default function ShopPage({ params }: ShopPageProps) {
  const { success, error: showError } = useSheiNotification();
  const { addToCart } = useCartStore();
  const { store_slug } = React.use(params);
  const t = useTranslation();
  const n = useLocalNum();
  const searchParams = useSearchParams();

  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<StorefrontBrand[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Held as category *slugs* so a shared ?category= link survives the shop
  // owner renaming a category. Several can be selected (?category=a,b); an
  // empty list means no category filter.
  const [activeCategories, setActiveCategories] = useState<string[]>(
    parseListParam(searchParams.get("category")),
  );
  // Brand *slugs* from ?brand= (plan feature "brands"); empty = every brand.
  const [activeBrands, setActiveBrands] = useState<string[]>(
    parseListParam(searchParams.get("brand")),
  );
  // Price range on the list price, whole taka from ?min= / ?max=; "" = open.
  const [minPrice, setMinPrice] = useState<string>(parsePriceParam(searchParams.get("min")));
  const [maxPrice, setMaxPrice] = useState<string>(parsePriceParam(searchParams.get("max")));
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("search") || "",
  );
  const [sortOption, setSortOption] = useState<ProductSortOption>(
    parseSortParam(searchParams.get("sort")),
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  const ITEMS_PER_PAGE = 10;
  const isLoadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const storeIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const updateURLParams = (
    category: string[],
    search: string,
    sort: ProductSortOption,
    brand: string[],
    min: string,
    max: string,
  ) => {
    const p = new URLSearchParams();
    if (category.length > 0) p.set("category", category.join(","));
    if (brand.length > 0) p.set("brand", brand.join(","));
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    if (search.trim()) p.set("search", search.trim());
    if (sort !== "default") p.set("sort", sort);
    const qs = p.toString();
    window.history.replaceState(
      {},
      "",
      `/${store_slug}/shop${qs ? `?${qs}` : ""}`,
    );
  };

  const loadProducts = useCallback(
    async (
      page: number,
      category: string[],
      search: string,
      sort: ProductSortOption,
      isInitialLoad: boolean = false,
      brandIds: string[] = [],
      priceRange?: { min?: number; max?: number },
    ) => {
      // Only "load more" is dropped while a request is in flight. A new
      // filter/search must always run — dropping it left the grid showing the
      // results of an earlier, half-typed query. Responses that arrive after
      // a newer request started are ignored below.
      if (!isInitialLoad && isLoadingRef.current) return;
      const requestId = ++requestIdRef.current;
      isLoadingRef.current = true;
      try {
        if (isInitialLoad) setLoading(true);
        else setLoadingMore(true);

        const categoryFilter = category.length > 0 ? category : undefined;
        const searchFilter = search.trim() || undefined;

        const result = await clientGetProducts(
          store_slug,
          page,
          ITEMS_PER_PAGE,
          categoryFilter,
          searchFilter,
          sort,
          brandIds.length > 0 ? brandIds : undefined,
          priceRange,
        );

        if (requestId !== requestIdRef.current) return;

        if (isInitialLoad) setProducts(result.products);
        else setProducts((prev) => [...prev, ...result.products]);

        setHasMore(result.hasMore);
        setTotalProducts(result.totalCount);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error(err);
        showError(t.shop.failedLoad);
      } finally {
        if (requestId === requestIdRef.current) {
          if (isInitialLoad) setLoading(false);
          else setLoadingMore(false);
          isLoadingRef.current = false;
        }
      }
    },
    [store_slug, showError],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      try {
        const storeId = await getStoreIdBySlug(store_slug);
        if (!storeId) {
          setStoreExists(false);
          return;
        }

        storeIdRef.current = storeId;
        setStoreExists(true);

        // Brands are only fetched here; a ?brand= link needs them resolved
        // before the first product load so it can filter by their ids.
        const brandsPromise = getStorefrontBrands(store_slug);
        const knownBrands = activeBrands.length > 0 ? await brandsPromise : [];
        const initialBrands = activeBrands.filter((slug) => knownBrands.some((b) => b.slug === slug));
        const initialBrandIds = initialBrands
          .map((slug) => knownBrands.find((b) => b.slug === slug)?.id)
          .filter((id): id is string => !!id);

        const [categoriesData, brandList] = await Promise.all([
          getCategoriesQuery(storeId),
          brandsPromise,
          loadProducts(
            1,
            activeCategories,
            searchQuery,
            sortOption,
            true,
            initialBrandIds,
            toPriceRange(minPrice, maxPrice),
          ),
        ]);

        setBrands(brandList);
        // A ?brand= that isn't one of this store's brands (or the plan has no
        // brands) is dropped rather than left filtering silently.
        if (!sameList(initialBrands, activeBrands)) setActiveBrands(initialBrands);

        if (categoriesData.data) {
          setCategories(categoriesData.data);

          // Links shared before the filter moved to slugs carry a category
          // *name* (e.g. ?category=Men's%20Shirts). Swap it for the matching
          // slug so the pills highlight correctly and the URL self-heals —
          // the query resolved it either way, so nothing was broken meanwhile.
          if (activeCategories.length > 0) {
            const healed = activeCategories.map((value) => {
              const bySlug = categoriesData.data.find((c) => c.slug === value);
              const byName = categoriesData.data.find(
                (c) => c.name.toLowerCase() === value.toLowerCase(),
              );
              return !bySlug && byName ? byName.slug : value;
            });
            if (!sameList(healed, activeCategories)) setActiveCategories(healed);
          }
        }
      } catch (err) {
        console.error(err);
        showError(t.shop.failedStore);
      }
    }

    init();
    updateURLParams(activeCategories, searchQuery, sortOption, activeBrands, minPrice, maxPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store_slug]);

  const activeBrandIds = brands.filter((b) => activeBrands.includes(b.slug)).map((b) => b.id);
  const priceRange = toPriceRange(minPrice, maxPrice);

  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    if (!storeIdRef.current) return;

    setCurrentPage(1);
    setHasMore(true);
    loadProducts(1, activeCategories, searchQuery, sortOption, true, activeBrandIds, priceRange);
    updateURLParams(activeCategories, searchQuery, sortOption, activeBrands, minPrice, maxPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategories, searchQuery, sortOption, activeBrands, minPrice, maxPrice]);

  // The header search (and shared links) navigate to /shop?search=… while this
  // page may already be mounted — the initial useState values above only read
  // the URL once, so follow later URL changes here. Our own replaceState calls
  // keep the URL equal to state, which makes this a no-op for them.
  const urlCategory = searchParams.get("category") || "";
  const urlSearch = searchParams.get("search") || "";
  const urlSort = parseSortParam(searchParams.get("sort"));
  const urlBrand = searchParams.get("brand") || "";
  const urlMin = parsePriceParam(searchParams.get("min"));
  const urlMax = parsePriceParam(searchParams.get("max"));
  useEffect(() => {
    if (!initializedRef.current) return;
    const nextBrands = parseListParam(urlBrand);
    const nextCategories = parseListParam(urlCategory);
    setMinPrice(urlMin);
    setMaxPrice(urlMax);
    setActiveBrands((prev) => (sameList(prev, nextBrands) ? prev : nextBrands));
    setActiveCategories((prev) => (sameList(prev, nextCategories) ? prev : nextCategories));
    setSearchQuery((prev) => (prev.trim() === urlSearch.trim() ? prev : urlSearch));
    setSortOption((prev) => (prev === urlSort ? prev : urlSort));
  }, [urlCategory, urlSearch, urlSort, urlBrand, urlMin, urlMax]);

  // One ViewCategory per distinct category selection (not per re-render), so
  // the dashboard can show which categories shoppers actually browse.
  const categoryKey = activeCategories.join(",");
  const lastTrackedCategory = useRef("");
  useEffect(() => {
    if (!categoryKey || categoryKey === lastTrackedCategory.current) return;
    // Report names, not slugs — wait for the category list to load so a
    // shared ?category= link resolves to a real name instead of a slug.
    if (categories.length === 0) return;
    lastTrackedCategory.current = categoryKey;
    const names = categoryKey
      .split(",")
      .map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug)
      .join(", ");
    fbq(FbEvent.VIEW_CATEGORY, { content_category: names, content_type: "product_group" }, store_slug);
  }, [categoryKey, categories, store_slug]);

  const handleFiltersChange = useCallback((next: ShopFilterValues) => {
    setActiveCategories(next.categories);
    setActiveBrands(next.brands);
    setMinPrice(next.minPrice);
    setMaxPrice(next.maxPrice);
    setSearchQuery("");
  }, []);

  const handleSortChange = useCallback((sort: ProductSortOption) => {
    setSortOption(sort);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveCategories([]);
    if (query.trim()) {
      fbq(FbEvent.SEARCH, { search_string: query.trim() }, store_slug);
    }
  }, [store_slug]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isLoadingRef.current) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadProducts(nextPage, activeCategories, searchQuery, sortOption, false, activeBrandIds, priceRange);
  }, [
    hasMore,
    loadingMore,
    currentPage,
    activeCategories,
    searchQuery,
    sortOption,
    activeBrandIds,
    priceRange,
    loadProducts,
  ]);

  const isProductInStock = useCallback((product: Product): boolean => {
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
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!isProductInStock(product)) {
      showError(t.shop.outOfStock);
      return;
    }
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
      success(`${product.name} ${t.shop.addedToCart}`);
    } catch (err) {
      console.error(err);
      showError(t.shop.failedAddToCart);
    } finally {
      setLoadingProductId(null);
    }
  };

  const filterValues: ShopFilterValues = {
    categories: activeCategories,
    brands: activeBrands,
    minPrice,
    maxPrice,
  };

  // The empty state names the filters the shopper sees, not their slugs.
  const activeFilterNames = [
    ...activeCategories.map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug),
    ...activeBrands.map((slug) => brands.find((b) => b.slug === slug)?.name ?? slug),
  ].join(", ");

  if (loading && products.length === 0) return <StorePageSkeleton />;
  if (storeExists === false) return <NotFoundPage />;

  return (
    // Fades in as the skeleton unmounts so the swap reads as loading
    // finishing rather than as a flash of new layout.
    <m.div
      className="min-h-screen bg-white dark:bg-gray-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="max-w-screen-2xl mx-auto flex items-start gap-8 px-4 sm:px-6 lg:px-8 py-6">
        {/* Desktop filter column — beside the grid, so it never covers the header */}
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto pr-2 lg:block">
          <ShopFilterSidebar
            categories={categories}
            brands={brands}
            values={filterValues}
            onFiltersChange={handleFiltersChange}
          />
        </aside>

        <div className="min-w-0 flex-1">
        {/* Toolbar: count, sort, applied chips, mobile Filter button */}
        <ProductFilterSection
          categories={categories}
          brands={brands}
          values={filterValues}
          onFiltersChange={handleFiltersChange}
          totalProducts={totalProducts}
          sortOption={sortOption}
          onSortChange={handleSortChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {/* Loading state */}
        {loading && products.length === 0 ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="h-7 w-7 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : products.length === 0 ? (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-2xl">
              {searchQuery ? "🔍" : "🛍️"}
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">
              {searchQuery
                ? `${t.shop.noResultsFor} "${searchQuery}"`
                : activeFilterNames
                  ? `${t.shop.nothingIn} "${activeFilterNames}" ${t.shop.yet}`.trim()
                  : t.shop.noProducts}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {t.shop.tryDifferent}
            </p>
          </m.div>
        ) : (
          <>
            <ProductGrid
              store_slug={store_slug}
              products={products}
              onAddToCart={handleAddToCart}
              loadingProductId={loadingProductId}
              productIndexOffset={(currentPage - 1) * ITEMS_PER_PAGE}
              columnsClassName="md:grid-cols-3 xl:grid-cols-4"
            />

            {/* Load More */}
            {hasMore && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 mt-10 mb-16"
              >
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="
                    group flex items-center gap-2.5 h-12 px-10 rounded-2xl
                    border-2 border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    text-gray-700 dark:text-gray-200
                    font-semibold text-sm
                    hover:border-gray-900 dark:hover:border-gray-400
                    hover:text-gray-900 dark:hover:text-white
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200 shadow-sm
                  "
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.shop.loadingMore}
                    </>
                  ) : (
                    <>
                      {t.shop.show10More}
                      <span className="text-gray-400 dark:text-gray-500 font-normal text-xs group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                        ({n(totalProducts - products.length)} {t.shop.remaining})
                      </span>
                    </>
                  )}
                </button>
              </m.div>
            )}

            {/* End state */}
            {!hasMore && products.length > 0 && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-1 py-12 border-t border-gray-100 dark:border-gray-800"
              >
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {[t.shop.allShownPrefix, n(totalProducts), t.shop.allShownSuffix].filter(s => s.trim()).join(" ")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t.shop.reachedEnd}
                </p>
              </m.div>
            )}
          </>
        )}
        </div>
      </div>
    </m.div>
  );
}
