"use client";

import React from "react";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";

interface LowStockSummaryProps {
  products: ProductRow[];
}

const LowStockSummary: React.FC<LowStockSummaryProps> = ({ products }) => {
  const outOfStock: string[] = [];
  const lowStock: string[] = [];

  products.forEach((product) => {
    if (product.stock === 0) outOfStock.push(product.title);
    else if (product.isLowStock) lowStock.push(product.title);

    if (product.variants) {
      product.variants.forEach((variant) => {
        const name = `${product.title} - ${variant.title}`;
        if (variant.stock === 0) outOfStock.push(name);
        else if (variant.isLowStock) lowStock.push(name);
      });
    }
  });

  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  const summaryItems = [
    {
      title: "Out of Stock",
      items: outOfStock,
      color: "bg-red-100 text-red-800",
    },
    {
      title: "Low Stock",
      items: lowStock,
      color: "bg-orange-100 text-orange-800",
    },
  ];

  return (
    <div className="space-y-2">
      {summaryItems.map(
        (group, idx) =>
          group.items.length > 0 && (
            <div
              key={idx}
              className={`p-4 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between ${group.color}`}
            >
              <span className="font-semibold text-sm">{group.title}</span>
              <span className="mt-2 md:mt-0 text-sm md:text-base">
                {group.items.join(", ")}
              </span>
              <span className="mt-2 md:mt-0 text-sm text-gray-700 font-medium">
                ({group.items.length} item{group.items.length > 1 ? "s" : ""})
              </span>
            </div>
          )
      )}
    </div>
  );
};

export default LowStockSummary;
