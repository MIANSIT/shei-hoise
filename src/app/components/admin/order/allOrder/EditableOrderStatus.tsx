"use client";

import React, { memo } from "react";
import { Select } from "antd";

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

const OrderStatusSelect: React.FC<{
  value: Props["status"];
  onChange: (v: Props["status"]) => void;
}> = ({ value, onChange }) => (
  <Select
    value={value}
    style={{ width: 130 }}
    onChange={v => onChange(v as Props["status"])}
    options={STATUS_OPTIONS}
  />
);

const MemoizedOrderStatusSelect = memo(OrderStatusSelect);

const EditableOrderStatus: React.FC<Props> = ({ status, onSave }) => {
  return (
    <MemoizedOrderStatusSelect
      value={status}
      onChange={onSave}
    />
  );
};

export default EditableOrderStatus;
