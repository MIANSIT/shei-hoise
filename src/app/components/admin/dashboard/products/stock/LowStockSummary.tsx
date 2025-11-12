"use client";

import React from "react";
import { Alert } from "antd";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";

interface LowStockSummaryProps {
  products: ProductRow[];
}

const LowStockSummary: React.FC<LowStockSummaryProps> = ({ products }) => {
  const countLowStockItems = (): number => {
    let count = 0;

    products.forEach((product) => {
      if (product.isLowStock) {
        count++;
      }
      if (product.variants) {
        product.variants.forEach((variant) => {
          if (variant.isLowStock) {
            count++;
          }
        });
      }
    });

    return count;
  };

  const lowStockCount = countLowStockItems();

  if (lowStockCount === 0) {
    return null;
  }

  return (
    <Alert
      message={`${lowStockCount} item(s) are low on stock`}
      type="warning"
      showIcon
      className="mb-4"
      description="Items highlighted in red are below their low stock threshold."
    />
  );
};

export default LowStockSummary;
