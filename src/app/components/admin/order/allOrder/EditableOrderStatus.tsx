"use client";

import React, { useState, useCallback, memo } from "react";
import { Select, Button, Space } from "antd";

interface Props {
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  onSave: (newStatus: Props["status"]) => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

// Named Select component
const OrderStatusSelect: React.FC<{
  value: Props["status"];
  onChange: (v: Props["status"]) => void;
  disabled: boolean;
}> = ({ value, onChange, disabled }) => (
  <Select
    value={value}
    style={{ width: 130 }}
    onChange={v => onChange(v as Props["status"])}
    disabled={disabled}
    options={STATUS_OPTIONS}
  />
);

// Memoize it for performance
const MemoizedOrderStatusSelect = memo(OrderStatusSelect);

const EditableOrderStatus: React.FC<Props> = ({ status, onSave }) => {
  const [selectedStatus, setSelectedStatus] = useState(status);
  const isLocked = status === "delivered";

  const handleSave = useCallback(() => {
    if (selectedStatus !== status) {
      onSave(selectedStatus);
    }
  }, [selectedStatus, status, onSave]);

  return (
    <Space>
      <MemoizedOrderStatusSelect
        value={selectedStatus}
        onChange={setSelectedStatus}
        disabled={isLocked}
      />
      {!isLocked && (
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      )}
    </Space>
  );
};

export default EditableOrderStatus;
