"use client";

import ProductCard from "./shop/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/lib/types/product";

interface ProductGridProps {
  products: Product[];
  store_slug: string;
  onAddToCart: (product: Product) => Promise<void>;
  loadingProductId: string | null;
  productIndexOffset?: number;
}

export default function ProductGrid({
  products,
  onAddToCart,
  loadingProductId,
  store_slug,
  productIndexOffset = 0,
}: ProductGridProps) {
  if (!products.length)
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <span className="text-2xl">🛍️</span>
        </div>
        <p className="text-gray-500 font-medium">No products available</p>
        <p className="text-gray-400 text-sm mt-1">
          Check back soon for new arrivals
        </p>
      </div>
    );

  return (
    <motion.div
      layout
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mt-6 mb-8"
    >
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <motion.div
            key={`${product.id}-${productIndexOffset + index}`}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 26,
              delay: Math.min(index * 0.04, 0.3),
            }}
            className="scroll-mt-24"
          >
            <ProductCard
              product={product}
              store_slug={store_slug}
              onAddToCart={() => onAddToCart(product)}
              isLoading={loadingProductId === product.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
