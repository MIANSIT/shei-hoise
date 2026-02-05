"use client";

import React from "react";
import { InputNumber, Tag, Tooltip, Checkbox } from "antd";
import Image from "next/image";
import {
  ProductRow,
  VariantRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import { ProductStatus } from "@/lib/types/enums";

interface StockTableMobileProps {
  products: ProductRow[];
  editedStocks: Record<string, number>;
  onStockChange: (
    productId: string,
    variantId: string | null,
    value: number,
  ) => void;
  onSingleUpdate: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  selectedRowKeys: React.Key[];
  onSelectChange: (keys: React.Key[]) => void;
  bulkActive?: boolean;
}

const StockTableMobile: React.FC<StockTableMobileProps> = ({
  products,
  editedStocks,
  onStockChange,
  onSingleUpdate,
  selectedRowKeys,
  onSelectChange,
  bulkActive = false,
}) => {
  const toggleSelect = (id: string) => {
    const newKeys = selectedRowKeys.includes(id)
      ? selectedRowKeys.filter((k) => k !== id)
      : [...selectedRowKeys, id];
    onSelectChange(newKeys);
  };

  return (
    <div className="flex flex-col gap-4">
      {products.map((product) => {
        const isSelected = selectedRowKeys.includes(product.id);
        return (
          <div
            key={product.id}
            className="border p-4 rounded-lg bg-white shadow-sm dark:bg-gray-900"
          >
            {/* Header with checkbox and title */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                disabled={!product.variants || product.variants.length === 0}
                onChange={() => toggleSelect(product.id)}
              />
              {product.imageUrl ? (
                <div className="w-12 h-12 relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-700" />
              )}
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-sm">{product.title}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(product.isLowStock || product.hasLowStockVariant) && (
                    <Tag color="red" className="text-xs">
                      {product.hasLowStockVariant
                        ? "Has Low Stock"
                        : "Low Stock"}
                    </Tag>
                  )}
                  {product.isInactiveProduct && (
                    <Tag
                      color={
                        product.status === ProductStatus.DRAFT ? "gold" : "red"
                      }
                      className="text-xs"
                    >
                      {product.status === ProductStatus.DRAFT
                        ? "Draft"
                        : "Inactive"}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Stock input for products without variants */}
            {(!product.variants || product.variants.length === 0) && (
              <div className="mt-3 flex items-center gap-2">
                <InputNumber
                  min={0}
                  value={editedStocks[product.id] ?? product.stock}
                  onChange={(value) =>
                    onStockChange(product.id, null, Number(value ?? 0))
                  }
                  className={`w-20 text-center font-bold ${
                    product.isLowStock
                      ? "bg-red-50 border-red-300 text-red-700"
                      : ""
                  }`}
                  status={product.isLowStock ? "warning" : undefined}
                />
                {product.isLowStock && (
                  <Tooltip
                    title={`Below threshold (${product.lowStockThreshold})`}
                  >
                    <span className="text-xs text-red-500 font-medium px-2 py-1 bg-red-50 rounded">
                      Low
                    </span>
                  </Tooltip>
                )}
                {product.id in editedStocks && !bulkActive && (
                  <SheiButton
                    size="small"
                    onClick={() =>
                      onSingleUpdate(product.id, null, editedStocks[product.id])
                    }
                  >
                    Update
                  </SheiButton>
                )}
              </div>
            )}

            {/* Render variants if any */}
            {product.variants && product.variants.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{variant.title}</span>
                      <div className="flex gap-1 mt-1">
                        {!variant.isActive && (
                          <Tag color="red" className="text-xs">
                            Inactive
                          </Tag>
                        )}
                        {variant.isLowStock && (
                          <Tag color="red" className="text-xs">
                            Low Stock
                          </Tag>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <InputNumber
                        min={0}
                        value={editedStocks[variant.id] ?? variant.stock}
                        onChange={(value) =>
                          onStockChange(
                            product.id,
                            variant.id,
                            Number(value ?? 0),
                          )
                        }
                        className={`w-20 text-center font-bold ${
                          variant.isLowStock
                            ? "bg-red-50 border-red-300 text-red-700"
                            : ""
                        }`}
                        status={variant.isLowStock ? "warning" : undefined}
                      />
                      {variant.id in editedStocks && !bulkActive && (
                        <SheiButton
                          size="small"
                          onClick={() =>
                            onSingleUpdate(
                              product.id,
                              variant.id,
                              editedStocks[variant.id],
                            )
                          }
                        >
                          Update
                        </SheiButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StockTableMobile;
