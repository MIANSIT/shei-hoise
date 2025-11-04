"use client";

import React from "react";
import { InputNumber, Checkbox } from "antd";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout";
import {
  ProductRow,
} from "@/lib/hook/products/stock/mapProductsForTable";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import Image from "next/image";

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
    <div className="flex flex-col gap-4 md:hidden">
      {products.map((record) => {
        const variants = record.variants ?? [];
        const editedValue = editedStocks[record.id] ?? record.stock;
        const showUpdateButton = record.id in editedStocks && !bulkActive;

        const cardContent = variants.length ? (
          <div className="flex flex-col gap-2">
            {variants.map((v) => {
              const editedVariantValue = editedStocks[v.id] ?? v.stock;
              const showVariantUpdate = v.id in editedStocks && !bulkActive;

              return (
                <div
                  key={v.id}
                  className="border rounded-xl p-2 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{v.title}</span>
                    <span>${v.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <InputNumber
                      min={0}
                      value={editedVariantValue}
                      onChange={(value) =>
                        onStockChange(record.id, v.id, Number(value ?? 0))
                      }
                      className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
                    />
                    {showVariantUpdate && (
                      <SheiButton
                        size="small"
                        onClick={() =>
                          onSingleUpdate(record.id, v.id, editedVariantValue)
                        }
                      >
                        Update
                      </SheiButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <InputNumber
              min={0}
              value={editedValue}
              onChange={(value) =>
                onStockChange(record.id, null, Number(value ?? 0))
              }
              className="!w-20 text-center font-bold [&>input]:text-center [&>input]:font-bold"
            />
            {showUpdateButton && (
              <SheiButton
                size="small"
                onClick={() => onSingleUpdate(record.id, null, editedValue)}
              >
                Update
              </SheiButton>
            )}
          </div>
        );

        return (
          <ProductCardLayout
            key={record.id}
            image={
              record.imageUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                  <Image
                    src={record.imageUrl}
                    alt={record.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-xl" />
              )
            }
            title={record.title}
            subtitle="Stock Management"
            content={cardContent}
            actions={
              <Checkbox
                checked={selectedRowKeys.includes(record.id)}
                onChange={(e) => handleCheckbox(record.id, e.target.checked)}
              />
            }
          />
        );
      })}
    </div>
  );
};

export default StockTableMobile;
