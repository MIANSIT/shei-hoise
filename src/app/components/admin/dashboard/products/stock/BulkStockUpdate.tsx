"use client";

import React, { useState } from "react";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { InputNumber, Spin } from "antd";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

interface BulkStockUpdateProps {
  selectedCount: number;
  onUpdate: (value: number) => Promise<void>;
}

const BulkStockUpdate: React.FC<BulkStockUpdateProps> = ({
  selectedCount,
  onUpdate,
}) => {
  const [bulkStock, setBulkStock] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (bulkStock <= 0) return;

    setLoading(true);
    try {
      await onUpdate(bulkStock);
      setBulkStock(0);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center space-x-2 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <SheiButton
          onClick={() => setBulkStock((prev) => Math.max(0, prev - 1))}
          icon={<MinusOutlined />}
          type="default"
          className="w-10 h-10 flex items-center justify-center text-xl"
          disabled={loading}
        />

        <InputNumber
          min={0}
          value={bulkStock}
          onChange={(value) => setBulkStock(Number(value ?? 0))}
          controls={false}
          disabled={loading}
          className="w-16 text-center font-bold [&>input]:text-center [&>input]:font-bold rounded-lg"
          formatter={(value) => value?.toString().padStart(2, "0") ?? "00"}
        />

        <SheiButton
          onClick={() => setBulkStock((prev) => prev + 1)}
          icon={<PlusOutlined />}
          type="default"
          className="w-10 h-10 flex items-center justify-center text-xl"
          disabled={loading}
        />
      </div>

      <SheiButton onClick={handleClick} disabled={bulkStock <= 0 || loading}>
        {loading ? <Spin size="small" /> : "Update Stock"}
      </SheiButton>
    </div>
  );
};

export default BulkStockUpdate;
