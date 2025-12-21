"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
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
  const router = useRouter();

  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // State for filters - Initialize from URL
  const [activeCategory, setActiveCategory] = useState<string>(
    searchParams.get("category") || "All Products"
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("search") || ""
  );
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  
  const ITEMS_PER_PAGE = 5;
  const isLoadingRef = useRef(false);
  const loadAnchorRef = useRef<HTMLDivElement>(null);

  // Update URL params
  const updateURLParams = useCallback((category: string, search: string) => {
    const params = new URLSearchParams();
    
    if (category !== "All Products") {
      params.set("category", category);
    }
    
    if (search.trim()) {
      params.set("search", search.trim());
    }
    
    const queryString = params.toString();
    const newUrl = `/${store_slug}${queryString ? `?${queryString}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [store_slug]);

  // Load products function
  const loadProducts = useCallback(async (
    page: number, 
    category: string, 
    search: string,
    isInitialLoad: boolean = false
  ) => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Prepare filters
      const categoryFilter = category === "All Products" ? undefined : category;
      const searchFilter = search.trim() || undefined;

      // Load products
      const result = await clientGetProducts(
        store_slug,
        page,
        ITEMS_PER_PAGE,
        categoryFilter,
        searchFilter
      );

      if (isInitialLoad) {
        setProducts(result.products);
      } else {
        setProducts(prev => [...prev, ...result.products]);
      }

      setHasMore(result.hasMore);
      setTotalProducts(result.totalCount);
      
      // Scroll to newly loaded products
      if (!isInitialLoad && result.products.length > 0) {
        setTimeout(() => {
          loadAnchorRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load products");
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
      isLoadingRef.current = false;
    }
  }, [store_slug, showError]);

  // Initialize store and categories
  useEffect(() => {
    async function fetchData() {
      try {
        const storeId = await getStoreIdBySlug(store_slug);
        if (!storeId) {
          setStoreExists(false);
          return;
        }

        setStoreExists(true);

        // Fetch categories
        const categoriesData = await getCategoriesQuery(storeId);
        if (categoriesData.data) {
          setCategories(categoriesData.data);
        }
      } catch (err) {
        console.error(err);
        showError("Failed to load store data");
      }
    }

    fetchData();
  }, [store_slug, showError]);

  // Load products when filters change
  useEffect(() => {
    if (storeExists === true) {
      setCurrentPage(1);
      setHasMore(true);
      loadProducts(1, activeCategory, searchQuery, true);
      
      // Update URL
      updateURLParams(activeCategory, searchQuery);
    }
  }, [activeCategory, searchQuery, storeExists, loadProducts, updateURLParams]);

  // Handle category change - CLEARS search
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    setSearchQuery(""); // Clear search when category changes
  }, []);

  // Handle search change - CLEARS category
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveCategory("All Products"); // Clear category when searching
  }, []);

  // Load more products
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isLoadingRef.current) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadProducts(nextPage, activeCategory, searchQuery, false);
  }, [hasMore, loadingMore, currentPage, activeCategory, searchQuery, loadProducts]);

  // Helper function to check if product is in stock
  const isProductInStock = useCallback((product: Product): boolean => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some((variant) => {
        const productInventory = variant.product_inventory?.[0];
        if (productInventory && productInventory.quantity_available > 0) {
          return true;
        }
        const stock = variant.stock;
        if (stock && stock.quantity_available > 0) {
          return true;
        }
        return false;
      });
    }

    const mainProductInventory = product.product_inventory?.[0];
    if (mainProductInventory && mainProductInventory.quantity_available > 0) {
      return true;
    }
    const mainStock = product.stock;
    if (mainStock && mainStock.quantity_available > 0) {
      return true;
    }

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

  if (loading && products.length === 0) {
    return <StorePageSkeleton />;
  }

  if (storeExists === false) {
    return <NotFoundPage />;
  }

  return (
    <>
      <div className="px-8 py-4">
        {/* Filter Section - NO Active Filters Display */}
        <ProductFilterSection
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories}
          totalProducts={totalProducts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {loading && products.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-lg font-medium mb-2">
              {searchQuery
                ? `No products found matching "${searchQuery}".`
                : activeCategory === "All Products"
                ? "No products available in this store."
                : `No products found in ${activeCategory} category.`}
            </div>
          </motion.div>
        ) : (
          <>
            {/* Product Grid */}
            <ProductGrid
              store_slug={store_slug}
              products={products}
              onAddToCart={handleAddToCart}
              loadingProductId={loadingProductId}
              productIndexOffset={(currentPage - 1) * ITEMS_PER_PAGE}
            />
            
            {/* Anchor for scrolling */}
            <div ref={loadAnchorRef} className="h-4" />
            
            {/* Show More Button */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center mt-12 mb-12"
              >
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                  className="min-w-48 px-8 py-6 text-base"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Show 5 More Products"
                  )}
                </Button>
              </motion.div>
            )}
            
            {/* End message */}
            {!hasMore && products.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center py-8 border-t"
              >
                <p className="text-muted-foreground mb-2">
                  Showing {products.length} of {totalProducts} products
                </p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve reached the end of the product list
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </>
  );
}