"use client";

import React from "react";
import ProductCard from "./shop/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/lib/types/product";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => Promise<void>;
  loadingProductId: string | null;
}

export default function ProductGrid({ products, onAddToCart, loadingProductId }: ProductGridProps) {
  if (!products.length) return <div className="text-center py-12 text-gray-500">🚫 No Products Available</div>;

  return (
    <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mt-8 mb-8">
      <AnimatePresence>
        {products.map((product) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.5 }}
          >
            <ProductCard
              product={product}
              onAddToCart={() => onAddToCart(product)}
              isLoading={loadingProductId === product.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
