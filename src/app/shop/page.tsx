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
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const { success } = useSheiNotification();
  const { addToCart } = useCartStore();

  // Convert dummy products to proper Product type
  const products: Product[] = dummyProducts.map(product => ({
    ...product,
    currentPrice: parseFloat(product.currentPrice),
    originalPrice: parseFloat(product.originalPrice)
  }));

  const handleAddToCart = async (product: Product) => {
    setLoadingStates((prev) => ({ ...prev, [product.id]: true }));
    addToCart(product);
    success(`${product.title} added to cart`);
    setLoadingStates((prev) => ({ ...prev, [product.id]: false }));
  };

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
              imageUrl={product.imageUrl}
              productLink={`/products/${product.id}`}
              discount={product.discount}
              onAddToCart={() => handleAddToCart(product)}
              isLoading={loadingStates[product.id] || false}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Shop;