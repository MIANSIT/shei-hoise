/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";

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
        setProducts(data);
      } catch (err) {
        console.error(err);
        error("Failed to load store or products");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [store_slug, error]);

  const handleAddToCart = async (product: Product) => {
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
    return (
      <>
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <span className="text-lg font-medium mt-2">Loading store...</span>
          </div>
        </div>
      </>
    );
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
