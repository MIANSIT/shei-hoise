"use client";

import React from "react";
import { Tooltip } from "antd";
import {
  Zap,
  PackageCheck,
  Package,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
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
}

const VariantStockItem: React.FC<VariantStockItemProps> = ({
  variant,
  productId,
  editedValue,
  onStockChange,
  onSingleUpdate,
  showUpdateButton,
  bulkActive = false,
}) => {
  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0)
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: <AlertTriangle className="w-3 h-3" />,
        text: "Out of Stock",
      };
    if (stock <= threshold)
      return {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: <TrendingDown className="w-3 h-3" />,
        text: "Low Stock",
      };
    if (stock <= threshold * 2)
      return {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: <Package className="w-3 h-3" />,
        text: "Medium Stock",
      };
    return {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: <PackageCheck className="w-3 h-3" />,
      text: "In Stock",
    };
  };

  const status = getStockStatus(variant.stock, variant.lowStockThreshold);

  return (
    <div
      className={`
      border-2 rounded-2xl p-4 transition-all duration-300 overflow-hidden
      ${
        variant.isLowStock
          ? "border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50"
          : "border-gray-100 bg-white"
      }
      ${
        variant.stock === 0
          ? "border-red-200 bg-gradient-to-r from-red-50 to-pink-50"
          : ""
      }
    `}
    >
      {/* Variant Header - Fixed layout */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900 text-base truncate flex-1">
            {variant.title}
          </h3>
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded-full border flex-shrink-0 ${status.color}`}
          >
            {status.icon}
            <span className="text-xs font-semibold whitespace-nowrap">
              {status.text}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-green-600 text-base whitespace-nowrap">
            ${variant.currentPrice.toFixed(2)}
          </span>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              variant.stock <= variant.lowStockThreshold
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Stock: {variant.stock}
          </span>
        </div>
      </div>

      {/* Stock Input Section */}
      <div className="pt-3 border-t border-gray-200">
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
