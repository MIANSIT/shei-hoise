"use client";
import React, { useState } from "react";
import MobileHeader from "../components/common/MobileHeader";
import DesktopHeader from "../components/common/DesktopHeader";
import ProductCard from "../components/shop/ProductCard";
import { useSheiNotification } from "../../lib/hook/useSheiNotification";
import { useCart } from "../../lib/context/CartContext";

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

  const products = [
    {
      id: 1,
      title: "Premium Wireless Headphones",
      category: "Audio",
      currentPrice: "199.99",
      originalPrice: "249.99",
      rating: 4.5,
      imageUrl: "/dummyProduct.avif",
      discount: 20,
    },
    {
      id: 2,
      title: "Stylish Watch",
      category: "Accessories",
      currentPrice: "159.99",
      originalPrice: "199.99",
      rating: 4.2,
      imageUrl: "/dummyProduct.avif",
      discount: 20,
    },
    {
      id: 3,
      title: "Smartphone X",
      category: "Electronics",
      currentPrice: "899.99",
      originalPrice: "999.99",
      rating: 4.8,
      imageUrl: "/dummyProduct.avif",
      discount: 10,
    },
    {
      id: 4,
      title: "Smartphone X",
      category: "Electronics",
      currentPrice: "899.99",
      originalPrice: "999.99",
      rating: 4.8,
      imageUrl: "/dummyProduct.avif",
      discount: 10,
    },
    {
      id: 5,
      title: "Smartphone X",
      category: "Electronics",
      currentPrice: "899.99",
      originalPrice: "999.99",
      rating: 4.8,
      imageUrl: "/dummyProduct.avif",
      discount: 10,
    },
  ];

  return (
    <>
      <MobileHeader />
      <DesktopHeader />
      
      <div className="px-8 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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