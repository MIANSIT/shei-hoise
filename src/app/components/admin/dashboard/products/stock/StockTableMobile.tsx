"use client";

import React from "react";
import { ProductRow } from "@/lib/hook/products/stock/mapProductsForTable";
import ProductStockCard from "./ProductStockCard";
// import VariantStockItem from "./VariantStockItem";

interface StockTableMobileProps {
  products: ProductRow[];
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
  const handleCheckbox = (id: string, checked: boolean) => {
    const keys = new Set(selectedRowKeys);
    if (checked) keys.add(id);
    else keys.delete(id);
    onSelectChange(Array.from(keys));
  };

  return (
    <div className="flex flex-col gap-6 md:hidden">
      {products.map((product) => (
        <ProductStockCard
          key={product.id}
          product={product}
          editedStocks={editedStocks}
          onStockChange={onStockChange}
          onSingleUpdate={onSingleUpdate}
          isSelected={selectedRowKeys.includes(product.id)}
          onSelectChange={(checked) => handleCheckbox(product.id, checked)}
          bulkActive={bulkActive}
        />
      ))}
    </div>
  );
};

export default StockTableMobile;
