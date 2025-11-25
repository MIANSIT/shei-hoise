"use client";

import React, { useEffect, useState } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";
import ProductFilterSection from "@/app/components/products/ProductFilterSection"; // Import the filter component
import { StorePageSkeleton } from "../components/skeletons/StorePageSkeleton";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories"; // Import your categories query
import { Product } from "@/lib/types/product";
import { Category } from "@/lib/types/category"; // Assuming you have a Category type
import NotFoundPage from "../not-found";
import { AddToCartType } from "@/lib/schema/checkoutSchema";

interface StorePageProps {
  params: Promise<{ store_slug: string }>;
}

export default function StorePage({ params }: StorePageProps) {
  const { success, error } = useSheiNotification();
  const { addToCart } = useCartStore();
  const { store_slug } = React.use(params);

  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All Products");
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const storeId = await getStoreIdBySlug(store_slug);
        if (!storeId) {
          setStoreExists(false);
          return;
        }

        setStoreExists(true);

        // Fetch products and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          clientGetProducts(store_slug),
          getCategoriesQuery(storeId),
        ]);

        // Set categories
        if (categoriesData.data) {
          setCategories(categoriesData.data);
        }

        // Sort products: in-stock first, out-of-stock last
        const sortedProducts = productsData.sort((a, b) => {
          const aInStock = isProductInStock(a);
          const bInStock = isProductInStock(b);

          if (aInStock && !bInStock) return -1;
          if (!aInStock && bInStock) return 1;
          return 0;
        });

        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts); // Initially show all products
      } catch (err) {
        console.error(err);
        error("Failed to load store or products");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [store_slug, error]);

  // Filter products when category changes
  useEffect(() => {
    if (activeCategory === "All Products") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) => product.category?.name === activeCategory
      );
      setFilteredProducts(filtered);
    }
  }, [activeCategory, products]);

  // Helper function to check if product is in stock
  const isProductInStock = (product: Product): boolean => {
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
  };

  const handleAddToCart = async (product: Product) => {
    if (!isProductInStock(product)) {
      error("This product is out of stock");
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
      error("Failed to add product to cart");
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  if (loading) {
    return <StorePageSkeleton />;
  }

  if (storeExists === false) {
    return <NotFoundPage />;
  }

  return (
    <>
      <div className="px-8 py-4">
        {/* Add the filter section */}
        <ProductFilterSection
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories}
        />

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-lg font-medium">
            {activeCategory === "All Products"
              ? "No products available in this store."
              : `No products found in ${activeCategory} category.`}
          </div>
        ) : (
          <ProductGrid
            store_slug={store_slug}
            products={filteredProducts}
            onAddToCart={handleAddToCart}
            loadingProductId={loadingProductId}
          />
        )}
      </div>
    </>
  );
}
