"use client";

import React from "react";
import { Checkbox } from "antd";
import { Package, TrendingDown } from "lucide-react";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";
import VariantStockItem from "./VariantStockItem";
import StockInputSection from "./StockInputSection";
import Image from "next/image";

interface ProductStockCardProps {
  product: ProductRow;
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
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  bulkActive?: boolean;
}

const ProductStockCard: React.FC<ProductStockCardProps> = ({
  product,
  editedStocks,
  onStockChange,
  onSingleUpdate,
  isSelected,
  onSelectChange,
  bulkActive = false,
}) => {
  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const shouldHighlight = product.isLowStock || product.hasLowStockVariant;

  return (
    <div
      className={`
        relative border-2 rounded-3xl p-4 md:p-6 transition-all duration-300 
        ${
          shouldHighlight
            ? "bg-linear-to-br from-red-50 via-orange-50 to-amber-50 border-red-200 shadow-xl"
            : "bg-linear-to-br from-white to-gray-50 border-gray-200 shadow-lg"
        }
      `}
    >
      {/* Image + Status Badge */}
      <div className="flex items-start gap-4">
        <div className="relative w-20 h-20 shrink-0">
          {product.imageUrl ? (
            <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-lg">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-2xl flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}

          {/* Product Status Badge */}
          {(product.status === "draft" || product.status === "inactive") && (
            <div
              className={`absolute -top-2 left-0 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md
    ${product.status === "draft" ? "bg-yellow-400" : "bg-red-500"}
  `}
            >
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </div>
          )}

          {/* Low Stock Badge */}
          {shouldHighlight && (
            <div className="absolute -bottom-2 right-0 bg-linear-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full shadow-md font-bold flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span
                title={
                  product.hasLowStockVariant
                    ? "One or more variants below threshold"
                    : `Current stock: ${product.stock}/${product.lowStockThreshold}`
                }
              >
                {product.hasLowStockVariant ? "HAS LOW STOCK" : "LOW STOCK"}
              </span>
            </div>
          )}
        </div>

        {/* Title & Selection */}
        <div className="flex-1 flex flex-col justify-between gap-2">
          <h2 className="text-base md:text-xl font-bold text-gray-900 leading-snug">
            {product.title}
          </h2>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onChange={(e) => onSelectChange(e.target.checked)}
              className="[&>.ant-checkbox-inner]:rounded-lg [&>.ant-checkbox-inner]:border-2 [&>.ant-checkbox-inner]:w-5 [&>.ant-checkbox-inner]:h-5"
            />
            <span className="text-sm text-gray-600 font-medium">Select</span>
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-gray-600 mt-2">
        {product.hasLowStockVariant
          ? "One or more variants are low on stock"
          : product.isLowStock
            ? `Stock level critical (${product.stock}/${product.lowStockThreshold})`
            : "Stock Management"}
      </p>

      {/* Content Section */}
      <div className="mt-3 space-y-3">
        {hasVariants ? (
          <div className="space-y-2">
            {variants.map((variant) => (
              <VariantStockItem
                key={variant.id}
                variant={variant}
                productId={product.id}
                editedValue={editedStocks[variant.id] ?? variant.stock}
                onStockChange={onStockChange}
                onSingleUpdate={onSingleUpdate}
                showUpdateButton={variant.id in editedStocks && !bulkActive}
                bulkActive={bulkActive}
                statusBadge={
                  !variant.isActive
                    ? { text: "Inactive", color: "red" }
                    : variant.isLowStock
                      ? { text: "Low Stock", color: "orange" }
                      : undefined
                }
              />
            ))}
          </div>
        ) : (
          <StockInputSection
            type="product"
            item={product}
            editedValue={editedStocks[product.id] ?? product.stock}
            onStockChange={(value) => onStockChange(product.id, null, value)}
            onSingleUpdate={() =>
              onSingleUpdate(
                product.id,
                null,
                editedStocks[product.id] ?? product.stock,
              )
            }
            showUpdateButton={product.id in editedStocks && !bulkActive}
            bulkActive={bulkActive}
          />
        )}
      </div>
    </div>
  );
};

export default ProductStockCard;
