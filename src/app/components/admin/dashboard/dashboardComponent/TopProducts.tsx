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
      <div className="text-center py-8 text-gray-500">
        No sales data available
      </div>
    );
  }

  const maxRevenue = Math.max(...products.map((p) => p.revenue));

  // Helper function to display currency
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
          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{product.name}</div>
              <div className="font-semibold">
                {formatCurrency(product.revenue)}
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{product.quantity} units sold</span>
              <span>{formatCurrency(avgRevenue)} avg</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-linear-to-r from-blue-500 to-purple-500 h-2 rounded-full"
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
