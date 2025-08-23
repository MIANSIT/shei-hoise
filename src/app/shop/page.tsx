"use client";

import React, { useState } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import { Product } from "@/lib/types/product";
import { dummyProducts } from "@/lib/store/dummyProducts";
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import ProductFilterSection from "../components/product/ProductFilter";
import ProductGrid from "../components/product/ProductGrid";

export default function Shop() {
  const { success } = useSheiNotification();
  const { addToCart } = useCartStore();
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const handleAddToCart = async (product: Product) => {
    setLoadingProductId(product.id);
    try {
      addToCart({
        ...product,
        imageUrl: product.imageUrl || product.images[0],
      });
      success(`${product.title} added to cart`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingProductId(null);
    }
  };

  const products: Product[] = dummyProducts.map((product) => ({
    ...product,
    currentPrice: parseFloat(product.currentPrice),
    originalPrice: parseFloat(product.originalPrice),
    imageUrl: product.images[0],
  }));

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <>
      <Header />
      <div className="px-8 py-4">
        <ProductFilterSection
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <ProductGrid
          products={filteredProducts}
          onAddToCart={handleAddToCart} // handleAddToCart is async
          loadingProductId={loadingProductId}
        />
      </div>
      <Footer />
    </>
  );
}
