"use client";

import React from "react";
import { Card } from "antd";
import { Product } from "@/lib/hook/useDashboardData";

interface TopProductsProps {
  products: Product[];
  title?: string;
}

const TopProducts: React.FC<TopProductsProps> = ({
  products,
  title = "Top Products",
}) => {
  return (
    <Card
      title={title}
      className="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <ul className="space-y-3">
        {products.map((product, idx) => (
          <li
            key={idx}
            className="flex justify-between items-center border-b pb-1 last:border-b-0  transition-colors rounded-md p-1"
          >
            <span className="font-medium">{product.name}</span>
            <span className="text-gray-700 font-semibold">{product.price}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default TopProducts;
