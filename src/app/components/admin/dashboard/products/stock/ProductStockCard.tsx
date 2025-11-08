"use client";

import React from "react";
import { Checkbox, Badge } from "antd";
import { Package, AlertTriangle, TrendingDown } from "lucide-react";
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
    value: number
  ) => void;
  onSingleUpdate: (
    productId: string,
    variantId: string | null,
    quantity: number
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
      relative border-2 rounded-3xl p-6 transition-all duration-300 
      ${
        shouldHighlight
          ? "bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 border-red-200 shadow-xl"
          : "bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg"
      }
    `}
    >
      {/* Header Section - Fixed layout */}
      <div className="flex flex-col gap-4 mb-6">
        {/* First row: Image and Selection */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Product Image */}
            <div className="relative">
              {product.imageUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl shadow-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Status Badges */}
              {shouldHighlight && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>!</span>
                  </div>
                </div>
              )}

              {hasVariants && (
                <div className="absolute -bottom-2 -left-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full shadow-lg font-bold">
                    {variants.length} variants
                  </div>
                </div>
              )}
            </div>

            {/* Product Title and Selection */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {product.title}
              </h2>

              {/* Selection Checkbox - Moved here */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Select
                </span>
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => onSelectChange(e.target.checked)}
                  className="[&>.ant-checkbox-inner]:rounded-lg [&>.ant-checkbox-inner]:border-2 [&>.ant-checkbox-inner]:w-5 [&>.ant-checkbox-inner]:h-5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Second row: Low Stock Badge and Subtitle */}
        <div className="flex flex-col gap-2">
          {shouldHighlight && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {product.hasLowStockVariant ? "HAS LOW STOCK" : "LOW STOCK"}
                </span>
              </div>
            </div>
          )}

          <p
            className={`text-sm font-semibold ${
              shouldHighlight ? "text-orange-600" : "text-gray-600"
            }`}
          >
            {product.hasLowStockVariant
              ? "One or more variants are low on stock"
              : product.isLowStock
              ? `Stock level critical (${product.stock}/${product.lowStockThreshold})`
              : "Stock Management"}
          </p>
        </div>
      </div>

      {/* Content Section */}
      {hasVariants ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-800">
              Variants
            </span>
            <Badge
              count={variants.length}
              showZero
              className="bg-blue-100 text-blue-600 border-blue-200 text-sm font-semibold"
            />
          </div>

          <div className="grid gap-3">
            {/* Reduced gap from gap-4 to gap-3 */}
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
              />
            ))}
          </div>
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
              editedStocks[product.id] ?? product.stock
            )
          }
          showUpdateButton={product.id in editedStocks && !bulkActive}
          bulkActive={bulkActive}
        />
      )}
    </div>
  );
};

export default ProductStockCard;
