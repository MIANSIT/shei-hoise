// File: BulkStockUpdate.tsx
"use client";

import React, { useState } from "react";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { InputNumber, Spin } from "antd";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

interface BulkStockUpdateProps {
  selectedCount: number;
  onUpdate: (value: number) => Promise<void>;
  loading?: boolean;
}

const BulkStockUpdate: React.FC<BulkStockUpdateProps> = ({
  selectedCount,
  onUpdate,
  loading = false,
}) => {
  const [bulkStock, setBulkStock] = useState<number>(0);

  const handleClick = async () => {
    if (selectedCount === 0) return;

    // Confirm only for 0

    // Normal update
    await onUpdate(bulkStock);
    setBulkStock(0);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-2 mb-4">
      <div className="flex flex-col items-center gap-2 md:flex-row md:gap-2">
        <div className="flex items-center gap-2">
          <SheiButton
            onClick={() => setBulkStock((prev) => prev - 1)}
            icon={<MinusOutlined />}
            type="default"
            className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center text-xl"
            disabled={loading}
          />

          <InputNumber
            value={bulkStock}
            onChange={(value) => setBulkStock(Number(value ?? 0))}
            controls={false}
            disabled={loading}
            className="w-20 md:w-16 text-center font-bold [&>input]:text-center [&>input]:font-bold [&>input]:text-lg md:[&>input]:text-base rounded-xl"
            size="large"
          />

          <SheiButton
            onClick={() => setBulkStock((prev) => prev + 1)}
            icon={<PlusOutlined />}
            type="default"
            className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center text-xl"
            disabled={loading}
          />
        </div>

        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold border border-blue-200">
          {selectedCount} selected
        </div>
      </div>

      <SheiButton
        onClick={handleClick}
        disabled={loading}
        className="w-full md:w-auto justify-center py-3 md:py-2"
      >
        {loading ? <Spin size="small" /> : `Update ${selectedCount} Items`}
      </SheiButton>
    </div>
  );
};

export default BulkStockUpdate;
