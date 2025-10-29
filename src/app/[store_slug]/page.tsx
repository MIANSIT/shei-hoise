"use client";

import React, { useEffect, useState, use } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { Product } from "@/lib/types/product";

interface StorePageProps {
  params: Promise<{ store_slug: string }>;
}

export default function StorePage({ params }: StorePageProps) {
  const { success, error } = useSheiNotification();
  const { addToCart } = useCartStore();

  const { store_slug } = use(params); // unwrap promise safely

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await clientGetProducts(store_slug);
        setProducts(data);
      } catch (err) {
        console.error(err);
        error("Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
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

  return (
    <>
      <Header />
      <div className="px-8 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="text-lg font-medium">Loading products...</span>
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
