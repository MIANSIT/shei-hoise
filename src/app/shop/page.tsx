"use client";
import React, { useState } from "react";
import MobileHeader from "../components/common/MobileHeader";
import DesktopHeader from "../components/common/DesktopHeader";
import ProductCard from "../components/shop/ProductCard";
import { useSheiNotification } from "../../lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import { Product } from "@/lib/types/product";
import { dummyProducts } from "../../lib/store/dummyProducts";

const Shop = () => {
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null);
  const { success } = useSheiNotification();
  const { addToCart } = useCartStore();

  const handleAddToCart = async (product: Product) => {
    setLoadingProductId(product.id);
    try {
      await addToCart(product); // Ensure addToCart returns a promise
      success(`${product.title} added to cart`);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setLoadingProductId(null);
    }
  };

  const products: Product[] = dummyProducts.map(product => ({
    ...product,
    currentPrice: parseFloat(product.currentPrice),
    originalPrice: parseFloat(product.originalPrice)
  }));

  return (
    <>
      <MobileHeader />
      <DesktopHeader />

      <div className='px-8 py-8'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              title={product.title}
              category={product.category}
              currentPrice={product.currentPrice}
              originalPrice={product.originalPrice}
              rating={product.rating}
              imageUrl={product.images[0]}
              productLink={`/products/${product.id}`}
              discount={product.discount}
              onAddToCart={() => handleAddToCart(product)}
              isLoading={loadingProductId === product.id}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Shop;