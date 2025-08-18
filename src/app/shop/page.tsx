"use client";
import React, { useState } from "react";
import MobileHeader from "../components/common/MobileHeader";
import DesktopHeader from "../components/common/DesktopHeader";
import ProductCard from "../components/shop/ProductCard";
import { useSheiNotification } from "../../lib/hook/useSheiNotification";
import { useCart } from "../../lib/context/CartContext";
import { dummyProducts } from "../../lib/store/dummyProducts"; // ✅ imported product list

const Shop = () => {
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const { success } = useSheiNotification();
  const { addToCart } = useCart();







  const handleAddToCart = async (productId: number, productTitle: string) => {
    setLoadingStates(prev => ({ ...prev, [productId]: true }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    addToCart(1); // Add 1 to cart count
    success(`${productTitle} added to cart`);
    setLoadingStates(prev => ({ ...prev, [productId]: false }));
  };

  return (
    <>
      <MobileHeader />
      <DesktopHeader />
      
      <div className="px-8 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {dummyProducts.map((product) => (
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
              onAddToCart={() => handleAddToCart(product.id, product.title)}
              isLoading={loadingStates[product.id] || false}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Shop;