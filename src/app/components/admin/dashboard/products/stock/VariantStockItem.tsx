"use client";

import React from "react";
// import {
//   PackageCheck,
//   Package,
//   AlertTriangle,
//   TrendingDown,
// } from "lucide-react";
import { VariantRow } from "@/lib/hook/products/stock/mapProductsForTable";
import StockInputSection from "./StockInputSection";

interface VariantStockItemProps {
  variant: VariantRow;
  productId: string;
  editedValue: number;
  onStockChange: (
    productId: string,
    variantId: string | null,
    value: number
  ) => void;
  onSingleUpdate: (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => void;
  showUpdateButton: boolean;
  bulkActive?: boolean;
  statusBadge?: { text: string; color: string }; // ← added for inactive variants
}

const VariantStockItem: React.FC<VariantStockItemProps> = ({
  variant,
  productId,
  editedValue,
  onStockChange,
  onSingleUpdate,
  showUpdateButton,
  bulkActive = false,
  // statusBadge,
}) => {
  // const getStockStatus = (stock: number, threshold: number) => {
  //   if (stock === 0)
  //     return {
  //       color: "bg-red-100 text-red-800 border-red-200",
  //       icon: <AlertTriangle className="w-3 h-3" />,
  //       text: "Out of Stock",
  //     };
  //   if (stock <= threshold)
  //     return {
  //       color: "bg-orange-100 text-orange-800 border-orange-200",
  //       icon: <TrendingDown className="w-3 h-3" />,
  //       text: "Low Stock",
  //     };
  //   if (stock <= threshold * 2)
  //     return {
  //       color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  //       icon: <Package className="w-3 h-3" />,
  //       text: "Medium Stock",
  //     };
  //   return {
  //     color: "bg-green-100 text-green-800 border-green-200",
  //     icon: <PackageCheck className="w-3 h-3" />,
  //     text: "In Stock",
  //   };
  // };

  // const status = getStockStatus(variant.stock, variant.lowStockThreshold);

  return (
    <div
      className={`border-2 rounded-2xl p-3 transition-all duration-300
    ${
      !variant.isActive
        ? "border-red-300 bg-red-50"
        : "border-gray-100 bg-white"
    }
  `}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">
          {variant.title}
        </h3>

        {/* Only show inactive badge, no low stock badge on mobile */}
        {!variant.isActive && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            Inactive
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-green-600 text-sm">
          ${variant.currentPrice.toFixed(2)}
        </span>
        <span
          className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
            variant.stock <= variant.lowStockThreshold
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Stock: {variant.stock}
        </span>
      </div>

      <div className="mt-2">
        <StockInputSection
          type="variant"
          item={variant}
          editedValue={editedValue}
          onStockChange={(value) => onStockChange(productId, variant.id, value)}
          onSingleUpdate={() =>
            onSingleUpdate(productId, variant.id, editedValue)
          }
          showUpdateButton={showUpdateButton}
          bulkActive={bulkActive}
        />
      </div>
    </div>
  );
};

export default VariantStockItem;
