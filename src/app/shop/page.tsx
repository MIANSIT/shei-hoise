"use client";
import React from "react";
import MobileHeader from "../components/common/MobileHeader";
import DesktopHeader from "../components/common/DesktopHeader";
import ProductCard from "../components/shop/ProductCard";
import { useSheiNotification } from "../../lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import { Product } from "@/lib/types/product";
import { dummyProducts } from "../../lib/store/dummyProducts";
import Footer from "../components/common/Footer";

const Shop = () => {
  const { success } = useSheiNotification();
  const { addToCart } = useCartStore();

  const handleAddToCart = async (product: Product) => {
    try {
      // Create a product with the correct structure for the cart
      const cartProduct = {
        ...product,
        imageUrl: product.imageUrl || product.images[0],
      };
      addToCart(cartProduct); 
      success(`${product.title} added to cart`);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const products: Product[] = dummyProducts.map((product) => ({
    ...product,
    currentPrice: parseFloat(product.currentPrice),
    originalPrice: parseFloat(product.originalPrice),
    // Ensure imageUrl is set for the ProductCard
    imageUrl: product.images[0],
  }));

  return (
    <>
      <MobileHeader />
      <DesktopHeader />

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
            />
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Shop;