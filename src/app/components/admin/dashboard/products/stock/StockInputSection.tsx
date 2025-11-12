"use client";

import React from "react";
import { InputNumber, Tooltip } from "antd";
import { Zap } from "lucide-react";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import {
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";

interface StockInputSectionProps {
  type: "product" | "variant";
  item: ProductRow | VariantRow;
  editedValue: number;
  onStockChange: (value: number) => void;
  onSingleUpdate: () => void;
  showUpdateButton: boolean;
  bulkActive?: boolean;
}

const StockInputSection: React.FC<StockInputSectionProps> = ({
  type,
  item,
  editedValue,
  onStockChange,
  onSingleUpdate,
  showUpdateButton,
  bulkActive = false,
}) => {
  const isLowStock = item.isLowStock;
  const threshold = item.lowStockThreshold || 10;

  // Hide Low tag when update button is shown
  const shouldShowLowTag = isLowStock && !showUpdateButton;

  return (
    <div className="flex items-center gap-3 justify-between flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Tooltip
          title={
            isLowStock
              ? `Current: ${item.stock} / Threshold: ${threshold}`
              : `Current stock: ${item.stock}`
          }
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
              {type === "product" ? "Product Stock" : "Variant Stock"}
            </label>
            <div className="flex items-center gap-3">
              <InputNumber
                min={0}
                value={editedValue}
                onChange={(value) => onStockChange(Number(value ?? 0))}
                className={`
                  !w-28 text-center font-bold rounded-xl transition-all duration-200 flex-shrink-0
                  [&>input]:text-center [&>input]:font-bold [&>input]:rounded-lg [&>input]:text-base
                  ${
                    isLowStock
                      ? "[&>input]:bg-orange-50 [&>input]:border-orange-300 [&>input]:text-orange-700 [&>input]:shadow-sm"
                      : "[&>input]:bg-white [&>input]:border-gray-200"
                  }
                `}
                status={isLowStock ? "warning" : undefined}
              />

              {/* Show Low tag only when update button is NOT shown */}
              {shouldShowLowTag && (
                <Tooltip title={`Below threshold (${threshold})`}>
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-full shadow-md flex-shrink-0">
                    <Zap className="w-3 h-3" />
                    <span className="text-xs font-semibold whitespace-nowrap">
                      Low
                    </span>
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        </Tooltip>
      </div>

      {showUpdateButton && (
        <div className="flex flex-col gap-1 flex-shrink-0">
          <label className="text-sm font-medium text-gray-600 opacity-0">
            Update
          </label>
          <SheiButton
            size="small"
            className="bg-gradient-to-r from-green-500 to-green-600 border-0 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4 whitespace-nowrap"
            onClick={onSingleUpdate}
          >
            Update
          </SheiButton>
        </div>
      )}
    </div>
  );
};

export default StockInputSection;
