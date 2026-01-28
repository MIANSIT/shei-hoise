"use client";

import React from "react";
import { Tooltip } from "antd";
import { Zap } from "lucide-react";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import { Input } from "@/components/ui/input";
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
  const [inputValue, setInputValue] = React.useState(String(editedValue));

  const isLowStock = item.isLowStock;
  const threshold = item.lowStockThreshold || 10;

  // Hide Low tag when update button is shown
  const shouldShowLowTag = isLowStock && !showUpdateButton;

  // Keep input synced if editedValue changes from outside
  React.useEffect(() => {
    setInputValue(String(editedValue));
  }, [editedValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Remove leading zeros immediately
    const normalized = raw.replace(/^0+/, "");
    setInputValue(normalized);
    onStockChange(Number(normalized) || 0);
  };

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
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className={`
    w-28! text-center font-bold rounded-xl transition-all duration-200 shrink-0
    border
    ${
      isLowStock
        ? "bg-orange-50 border-orange-300 text-orange-700 shadow-sm dark:bg-orange-700 dark:text-orange-50 dark:border-orange-600"
        : "bg-white border-gray-200 text-black dark:bg-gray-800 dark:text-white dark:border-gray-700"
    }
  `}
              />

              {/* Show Low tag only when update button is NOT shown */}
              {shouldShowLowTag && (
                <Tooltip title={`Below threshold (${threshold})`}>
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-full shadow-md shrink-0">
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
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-sm font-medium text-gray-600 opacity-0">
            Update
          </label>
          <SheiButton
            size="small"
            className="bg-linear-to-r from-green-500 to-green-600 border-0 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4 whitespace-nowrap"
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
