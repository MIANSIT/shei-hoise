"use client";

import React, { useState, memo, useEffect } from "react";
import { Select } from "antd";

interface Props {
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  onSave: (newStatus: Props["status"]) => void; // will now just update state
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

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

const MemoizedOrderStatusSelect = memo(OrderStatusSelect);

const EditableOrderStatus: React.FC<Props> = ({ status, onSave }) => {
  const [selectedStatus, setSelectedStatus] = useState(status);
  const isLocked = status === "delivered" || status === "cancelled";

  // Keep parent updated whenever selection changes
  useEffect(() => {
    onSave(selectedStatus);
  }, [selectedStatus, onSave]);

  return (
    <MemoizedOrderStatusSelect
      value={selectedStatus}
      onChange={setSelectedStatus}
      disabled={isLocked}
    />
  );
};

export default EditableOrderStatus;
