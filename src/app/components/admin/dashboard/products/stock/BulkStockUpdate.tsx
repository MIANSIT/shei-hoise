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
    // Allow negative values
    await onUpdate(bulkStock);
    setBulkStock(0);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center space-x-2 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <SheiButton
          onClick={() => setBulkStock((prev) => prev - 1)}
          icon={<MinusOutlined />}
          type="default"
          className="w-10 h-10 flex items-center justify-center text-xl"
          disabled={loading}
        />

        <InputNumber
          value={bulkStock}
          onChange={(value) => setBulkStock(Number(value ?? 0))}
          controls={false}
          disabled={loading}
          className="w-16 text-center font-bold [&>input]:text-center [&>input]:font-bold rounded-lg"
        />

        <SheiButton
          onClick={() => setBulkStock((prev) => prev + 1)}
          icon={<PlusOutlined />}
          type="default"
          className="w-10 h-10 flex items-center justify-center text-xl"
          disabled={loading}
        />
      </div>

      <SheiButton onClick={handleClick} disabled={loading}>
        {loading ? <Spin size="small" /> : "Update Stock"}
      </SheiButton>
    </div>
  );
};

export default BulkStockUpdate;
