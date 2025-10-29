"use client";

import React, { useEffect, useState,use  } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug"; // your new query
import { Product } from "@/lib/types/product";
import NotFoundPage from "../not-found";

interface StorePageProps {
  params: Promise<{ store_slug: string }>;
}

export default function StorePage({ params }: StorePageProps) {
  const { success, error } = useSheiNotification();
  const { addToCart } = useCartStore();
  const { store_slug } = use(params);

  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Check if store exists
        const storeId = await getStoreIdBySlug(store_slug);
        if (!storeId) {
          setStoreExists(false); // store not found
          return;
        }

        setStoreExists(true);

        // Fetch products
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
      await addToCart({
        ...product,
        imageUrl:
          product.primary_image?.image_url ||
          product.images?.[0] ||
          "/placeholder.png",
        currentPrice:
          product.variants?.[0]?.discounted_price ??
          product.variants?.[0]?.base_price ??
          product.discounted_price ??
          product.base_price,
      });
      success(`${product.name} added to cart`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProductId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center py-20">
          <span className="text-lg font-medium">Loading...</span>
        </div>
        <Footer />
      </>
    );
  }

  if (storeExists === false) {
    return <NotFoundPage />;
  }

  return (
    <>
      <Header />
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
      <Footer />
    </>
  );
}
