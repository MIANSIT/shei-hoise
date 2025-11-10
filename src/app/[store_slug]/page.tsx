/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";
import { StorePageSkeleton } from "../components/skeletons/StorePageSkeleton";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { Product } from "@/lib/types/product";
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

        const data = await clientGetProducts(store_slug);
        
        // Sort products: in-stock first, out-of-stock last
        const sortedProducts = data.sort((a, b) => {
          const aInStock = isProductInStock(a);
          const bInStock = isProductInStock(b);
          
          if (aInStock && !bInStock) return -1; // a comes first
          if (!aInStock && bInStock) return 1;  // b comes first
          return 0; // keep original order
        });
        
        setProducts(sortedProducts);
      } catch (err) {
        console.error(err);
        error("Failed to load store or products");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [store_slug, error]);

  // Helper function to check if product is in stock - FIXED with proper null checks
  const isProductInStock = (product: Product): boolean => {
    if (product.variants && product.variants.length > 0) {
      // Check if any variant has stock (check both stock and product_inventory)
      return product.variants.some(variant => {
        // First check product_inventory (API response)
        const productInventory = variant.product_inventory?.[0];
        if (productInventory && productInventory.quantity_available > 0) {
          return true;
        }
        // Fallback to stock (TypeScript interface)
        const stock = variant.stock;
        if (stock && stock.quantity_available > 0) {
          return true;
        }
        return false;
      });
    }
    
    // For products without variants, check main product stock (both fields)
    // First check product_inventory (API response)
    const mainProductInventory = product.product_inventory?.[0];
    if (mainProductInventory && mainProductInventory.quantity_available > 0) {
      return true;
    }
    // Fallback to stock (TypeScript interface)
    const mainStock = product.stock;
    if (mainStock && mainStock.quantity_available > 0) {
      return true;
    }
    
    return false;
  };

  const handleAddToCart = async (product: Product) => {
    // Don't proceed if product is out of stock
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

      await addToCart(cartProduct);
      success(`${product.name} added to cart`);
    } catch (err) {
      console.error(err);
      error("Failed to add product to cart");
    } finally {
      setLoadingProductId(null);
    }
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
        {products.length === 0 ? (
          <div className="text-center py-20 text-lg font-medium">
            No products available in this store.
          </div>
        ) : (
          <ProductGrid
            store_slug={store_slug}
            products={products}
            onAddToCart={handleAddToCart}
            loadingProductId={loadingProductId}
          />
        )}
      </div>
    </>
  );
}