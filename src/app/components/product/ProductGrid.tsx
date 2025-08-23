"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "./shop/ProductCard";
import { Product } from "@/lib/types/product";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => Promise<void>; // ✅ change void → Promise<void>
  loadingProductId: number | null;
}

export default function ProductGrid({
  products,
  onAddToCart,
  loadingProductId,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12 text-lg font-medium">
        🚫 No Products Available
      </div>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mt-8 mb-8">
      <AnimatePresence>
        {products.map((product) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.5, rotate: -10, x: -50, y: -50 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 10, x: 50, y: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.5 }}
          >
            <ProductCard
              title={product.title}
              category={product.category}
              currentPrice={product.currentPrice}
              originalPrice={product.originalPrice}
              rating={product.rating}
              imageUrl={product.images[0]}
              productLink={`/products/${product.id}`}
              discount={product.discount}
              onAddToCart={() => onAddToCart(product)}
              isLoading={loadingProductId === product.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
