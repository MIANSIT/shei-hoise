/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { getProductsWithStoreSlug } from "@/lib/queries/products/getProductsWithStoreSlug";

export default function StorePage({
  params,
}: {
  params: Promise<{ store_slug: string }>;
}) {
  const { success, error } = useSheiNotification();
  const { addToCart } = useCartStore();

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvedParams = React.use(params);

  useEffect(() => {
    async function fetchStoreProducts() {
      try {
        const productData = await getProductsWithStoreSlug(
          resolvedParams.store_slug
        );
        setProducts(productData);
      } catch (err) {
        console.error(err);
        error("Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchStoreProducts();
  }, [resolvedParams.store_slug, error]);

  const handleAddToCart = async (product: any) => {
    setLoadingProductId(product.id);
    try {
      await addToCart({ ...product, imageUrl: "" });
      success(`${product.name} added to cart`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProductId(null);
    }
  };

  const mappedProducts = products.map((p) => ({
    id: p.id,
    title: p.name,
    category: p.categories?.name || "Uncategorized",
    currentPrice: p.discounted_price ?? p.base_price,
    originalPrice: p.base_price,
    rating: 0,
    slug: p.slug,
    images: p.images || [],
    discount: p.base_price - (p.discounted_price ?? p.base_price),
  }));

  return (
    <>
      <Header />
      <div className="px-8 py-4">
        <ProductGrid
          products={mappedProducts}
          onAddToCart={handleAddToCart}
          loadingProductId={loadingProductId}
        />
      </div>
      <Footer />
    </>
  );
}
