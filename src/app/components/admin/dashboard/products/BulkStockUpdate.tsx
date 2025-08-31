"use client";

import React, { useState } from "react";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { InputNumber } from "antd";

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
      <div className="flex items-center space-x-2">
        {/* Minus button */}
        <button
          onClick={() => setBulkStock((prev) => Math.max(0, prev - 1))}
          className="text-xl px-2"
        >
          <MinusOutlined />
        </button>

        {/* Number input */}
        <InputNumber
          min={0}
          value={bulkStock}
          onChange={(value) => setBulkStock(Number(value ?? 0))}
          controls={false} // hide default buttons
          className="!w-16 text-center font-bold [&>input]:text-center [&>input]:font-bold rounded-lg"
          formatter={(value) => value?.toString().padStart(2, "0") ?? "00"}
        />

        {/* Plus button */}
        <button
          onClick={() => setBulkStock((prev) => prev + 1)}
          className="text-xl px-2"
        >
          <PlusOutlined />
        </button>
      </div>

      {/* Update button */}
      <button
        onClick={handleClick}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Update Selected ({selectedCount})
      </button>
    </div>
  );
};

export default BulkStockUpdate;
