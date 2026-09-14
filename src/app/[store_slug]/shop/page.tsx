"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../../components/products/ProductGrid";
import ProductFilterSection, {
  ALL_CATEGORIES,
} from "@/app/components/products/ProductFilterSection";
import { StorePageSkeleton } from "../../components/skeletons/StorePageSkeleton";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import {
  clientGetProducts,
  type ProductSortOption,
} from "@/lib/queries/products/clientGetProducts";
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category";
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
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Held as a category *slug* so a shared ?category= link survives the shop
  // owner renaming the category.
  const [activeCategory, setActiveCategory] = useState<string>(
    searchParams.get("category") || ALL_CATEGORIES,
  );
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
  const storeIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const updateURLParams = (
    category: string,
    search: string,
    sort: ProductSortOption,
  ) => {
    const p = new URLSearchParams();
    if (category !== ALL_CATEGORIES) p.set("category", category);
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
      category: string,
      search: string,
      sort: ProductSortOption,
      isInitialLoad: boolean = false,
    ) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      try {
        if (isInitialLoad) setLoading(true);
        else setLoadingMore(true);

        const categoryFilter =
          category === ALL_CATEGORIES ? undefined : category;
        const searchFilter = search.trim() || undefined;

        const result = await clientGetProducts(
          store_slug,
          page,
          ITEMS_PER_PAGE,
          categoryFilter,
          searchFilter,
          sort,
        );

        if (isInitialLoad) setProducts(result.products);
        else setProducts((prev) => [...prev, ...result.products]);

        setHasMore(result.hasMore);
        setTotalProducts(result.totalCount);
      } catch (err) {
        console.error(err);
        showError(t.shop.failedLoad);
      } finally {
        if (isInitialLoad) setLoading(false);
        else setLoadingMore(false);
        isLoadingRef.current = false;
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

        const [categoriesData] = await Promise.all([
          getCategoriesQuery(storeId),
          loadProducts(1, activeCategory, searchQuery, sortOption, true),
        ]);

        if (categoriesData.data) {
          setCategories(categoriesData.data);

          // Links shared before the filter moved to slugs carry a category
          // *name* (e.g. ?category=Men's%20Shirts). Swap it for the matching
          // slug so the pills highlight correctly and the URL self-heals —
          // the query resolved it either way, so nothing was broken meanwhile.
          if (activeCategory !== ALL_CATEGORIES) {
            const bySlug = categoriesData.data.find(
              (c) => c.slug === activeCategory,
            );
            const byName = categoriesData.data.find(
              (c) => c.name.toLowerCase() === activeCategory.toLowerCase(),
            );
            if (!bySlug && byName) setActiveCategory(byName.slug);
          }
        }
      } catch (err) {
        console.error(err);
        showError(t.shop.failedStore);
      }
    }

    init();
    updateURLParams(activeCategory, searchQuery, sortOption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store_slug]);

  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    if (!storeIdRef.current) return;

    setCurrentPage(1);
    setHasMore(true);
    loadProducts(1, activeCategory, searchQuery, sortOption, true);
    updateURLParams(activeCategory, searchQuery, sortOption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchQuery, sortOption]);

  const handleCategoryChange = useCallback((categorySlug: string) => {
    setActiveCategory(categorySlug);
    setSearchQuery("");
  }, []);

  const handleSortChange = useCallback((sort: ProductSortOption) => {
    setSortOption(sort);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveCategory(ALL_CATEGORIES);
    if (query.trim()) {
      fbq(FbEvent.SEARCH, { search_string: query.trim() }, store_slug);
    }
  }, [store_slug]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isLoadingRef.current) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadProducts(nextPage, activeCategory, searchQuery, sortOption, false);
  }, [
    hasMore,
    loadingMore,
    currentPage,
    activeCategory,
    searchQuery,
    sortOption,
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

  // The empty state names the category the shopper sees, not its slug.
  const activeCategoryName =
    categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory;

  if (loading && products.length === 0) return <StorePageSkeleton />;
  if (storeExists === false) return <NotFoundPage />;

  return (
    // Fades in as the skeleton unmounts so the swap reads as loading
    // finishing rather than as a flash of new layout.
    <m.div
      className="min-h-screen bg-white dark:bg-gray-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Section */}
        <ProductFilterSection
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories}
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
                : activeCategory === ALL_CATEGORIES
                  ? t.shop.noProducts
                  : `${t.shop.nothingIn} "${activeCategoryName}" ${t.shop.yet}`.trim()}
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
    </m.div>
  );
}
