"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";
import ProductFilterSection from "@/app/components/products/ProductFilterSection";
import { StorePageSkeleton } from "../components/skeletons/StorePageSkeleton";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category";
import NotFoundPage from "../not-found";
import { AddToCartType } from "@/lib/schema/checkoutSchema";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface StorePageProps {
  params: Promise<{ store_slug: string }>;
}

export default function StorePage({ params }: StorePageProps) {
  const { success, error: showError } = useSheiNotification();
  const { addToCart } = useCartStore();
  const { store_slug } = React.use(params);
  const searchParams = useSearchParams();

  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>(
    searchParams.get("category") || "All Products",
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("search") || "",
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  const ITEMS_PER_PAGE = 10;
  const isLoadingRef = useRef(false);
  const storeIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const updateURLParams = (category: string, search: string) => {
    const p = new URLSearchParams();
    if (category !== "All Products") p.set("category", category);
    if (search.trim()) p.set("search", search.trim());
    const qs = p.toString();
    window.history.replaceState({}, "", `/${store_slug}${qs ? `?${qs}` : ""}`);
  };

  const loadProducts = useCallback(
    async (
      page: number,
      category: string,
      search: string,
      isInitialLoad: boolean = false,
    ) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      try {
        if (isInitialLoad) setLoading(true);
        else setLoadingMore(true);

        const categoryFilter =
          category === "All Products" ? undefined : category;
        const searchFilter = search.trim() || undefined;

        const result = await clientGetProducts(
          store_slug,
          page,
          ITEMS_PER_PAGE,
          categoryFilter,
          searchFilter,
        );

        if (isInitialLoad) setProducts(result.products);
        else setProducts((prev) => [...prev, ...result.products]);

        setHasMore(result.hasMore);
        setTotalProducts(result.totalCount);
      } catch (err) {
        console.error(err);
        showError("Failed to load products");
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
          loadProducts(1, activeCategory, searchQuery, true),
        ]);

        if (categoriesData.data) setCategories(categoriesData.data);
      } catch (err) {
        console.error(err);
        showError("Failed to load store data");
      }
    }

    init();
    updateURLParams(activeCategory, searchQuery);
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
    loadProducts(1, activeCategory, searchQuery, true);
    updateURLParams(activeCategory, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchQuery]);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    setSearchQuery("");
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveCategory("All Products");
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isLoadingRef.current) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadProducts(nextPage, activeCategory, searchQuery, false);
  }, [
    hasMore,
    loadingMore,
    currentPage,
    activeCategory,
    searchQuery,
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
      showError("This product is out of stock");
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
      success(`${product.name} added to cart`);
    } catch (err) {
      console.error(err);
      showError("Failed to add product to cart");
    } finally {
      setLoadingProductId(null);
    }
  };

  if (loading && products.length === 0) return <StorePageSkeleton />;
  if (storeExists === false) return <NotFoundPage />;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Section */}
        <ProductFilterSection
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories}
          totalProducts={totalProducts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {/* Loading state */}
        {loading && products.length === 0 ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="h-7 w-7 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-2xl">
              {searchQuery ? "🔍" : "🛍️"}
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : activeCategory === "All Products"
                  ? "No products available yet"
                  : `Nothing in "${activeCategory}" yet`}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Try a different search or category
            </p>
          </motion.div>
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
              <motion.div
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
                      Loading more…
                    </>
                  ) : (
                    <>
                      Show 10 more products
                      <span className="text-gray-400 dark:text-gray-500 font-normal text-xs group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                        ({totalProducts - products.length} remaining)
                      </span>
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* End state */}
            {!hasMore && products.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-1 py-12 border-t border-gray-100 dark:border-gray-800"
              >
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  All {totalProducts.toLocaleString()} products shown
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  You&apos;ve reached the end
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
