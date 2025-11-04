"use client";

import React from "react";

interface TopProduct {
  name: string;
  quantity: number;
  revenue: string; // e.g., "$120"
}

interface TopProductsProps {
  products: TopProduct[];
  title?: string;
}

const TopProducts: React.FC<TopProductsProps> = ({
  products,
  title = "Top Products",
}) => {
  const parseRevenue = (rev: string) => Number(rev.replace(/[^0-9.-]+/g, ""));

  // Sort by revenue descending and take top 5
  const topProducts = [...products]
    .sort((a, b) => parseRevenue(b.revenue) - parseRevenue(a.revenue))
    .slice(0, 4);

  const maxRevenue = Math.max(...topProducts.map((p) => parseRevenue(p.revenue)));

  // Function to calculate premium gradient color based on percentage
  const getGradientColor = (percent: number) => {
    // 0% = bronze (#cd7f32), 50% = gold (#ffd700), 100% = emerald green (#34d399)
    if (percent < 50) return `linear-gradient(to right, #cd7f32, #ffd700)`;
    return `linear-gradient(to right, #ffd700, #34d399)`;
  };

  return (
    <div className="shadow-lg rounded-xl p-6 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ul className="space-y-3">
        {topProducts.map((product, idx) => {
          const revenueValue = parseRevenue(product.revenue);
          const progressPercent = (revenueValue / maxRevenue) * 100;

          return (
            <li
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg transition-colors relative bg-gray-50 dark:bg-gray-700"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {product.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300">
                  {product.quantity} pcs
                </span>
              </div>
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {product.revenue}
              </span>

              {/* Dynamic premium gradient progress bar */}
              <div
                className="absolute left-0 bottom-0 h-1 rounded-r-full"
                style={{
                  width: `${progressPercent}%`,
                  background: getGradientColor(progressPercent),
                }}
              ></div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TopProducts;
