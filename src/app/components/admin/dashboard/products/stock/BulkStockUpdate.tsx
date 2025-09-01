"use client";

import React, { useState } from "react";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { InputNumber } from "antd";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

interface BulkStockUpdateProps {
  selectedCount: number;
  onUpdate: (value: number) => void;
}

const BulkStockUpdate: React.FC<BulkStockUpdateProps> = ({
  selectedCount,
  onUpdate,
}) => {
  const [bulkStock, setBulkStock] = useState<number>(0);

  const handleClick = () => {
    if (bulkStock > 0) {
      onUpdate(bulkStock);
      setBulkStock(0);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center space-x-2 mb-2">
      {/* Custom counter */}
      <div className="flex items-center gap-2 mb-2">
        {/* Minus button */}
        <SheiButton
          onClick={() => setBulkStock((prev) => Math.max(0, prev - 1))}
          icon={<MinusOutlined />}
          type="default"
          className="w-10 h-10 flex items-center justify-center text-xl"
        />

        {/* Number input */}
        <InputNumber
          min={0}
          value={bulkStock}
          onChange={(value) => setBulkStock(Number(value ?? 0))}
          controls={false}
          className="w-16 text-center font-bold [&>input]:text-center [&>input]:font-bold rounded-lg"
          formatter={(value) => value?.toString().padStart(2, "0") ?? "00"}
        />

        {/* Plus button */}
        <SheiButton
          onClick={() => setBulkStock((prev) => prev + 1)}
          icon={<PlusOutlined />}
          type="default"
          className="w-10 h-10 flex items-center justify-center text-xl"
        />
      </div>

      {/* Update button */}
      <SheiButton onClick={handleClick} type="primary" className="px-4 py-2">
        Approved Stock ({selectedCount})
      </SheiButton>
    </div>
  );
};

export default BulkStockUpdate;
