"use client";

// import React, { useEffect, useRef } from "react";
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
      <div className="text-center py-12 text-gray-500">
        🚫 No Products Available
      </div>
    );

  return (
    <div className="relative">
      <motion.div
        layout
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mt-8 mb-8"
      >
        <AnimatePresence mode="popLayout">
          {products.map((product, index) => (
            <motion.div
              key={`${product.id}-${productIndexOffset + index}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.05,
              }}
              data-product-index={productIndexOffset + index}
              className="scroll-mt-32" // Increased scroll margin for better positioning
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
      
      {/* Anchor point for new products - placed BEFORE the new products */}
      {productIndexOffset > 0 && (
        <div 
          id="new-products-start"
          className="h-0"
          style={{ 
            position: 'relative',
            top: '-80px', // Positions it just above the new products
            visibility: 'hidden'
          }}
        />
      )}
    </div>
  );
}