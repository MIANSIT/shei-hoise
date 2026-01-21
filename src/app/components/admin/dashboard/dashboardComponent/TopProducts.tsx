"use client";

import React from "react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  const { currency, icon, loading } = useUserCurrencyIcon();

  if (loading) return <div>Loading...</div>;

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-foreground dark:text-gray-300">
        No sales data available
      </div>
    );
  }

  const maxRevenue = Math.max(...products.map((p) => p.revenue));

  const formatCurrency = (value: number) => {
    if (!currency) return value.toFixed(2);
    if (typeof icon === "string") return `${icon} ${value.toFixed(2)}`;
    return `${currency} ${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {products.map((product, idx) => {
        const revenuePercent = (product.revenue / maxRevenue) * 100;
        const avgRevenue =
          product.quantity > 0 ? product.revenue / product.quantity : 0;

        return (
          <div
            key={idx}
            className="p-4 sm:p-5 bg-sidebar-ring dark:bg-gray-700 rounded-lg"
          >
            {/* Top row: product name and revenue */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
              <div className="font-medium text-sm sm:text-base truncate">
                {product.name}
              </div>
              <div className="font-semibold text-sm sm:text-base">
                {formatCurrency(product.revenue)}
              </div>
            </div>

            {/* Middle row: quantity and avg */}
            <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-foreground dark:text-gray-300 gap-1 sm:gap-0 mb-2">
              <span>{product.quantity} units sold</span>
              <span>{formatCurrency(avgRevenue)} avg</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-linear-to-r from-blue-500 to-purple-500"
                style={{ width: `${revenuePercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopProducts;
