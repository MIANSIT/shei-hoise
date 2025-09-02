"use client";

import React, { memo } from "react";
import { Select } from "antd";

interface Props {
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  onSave: (newStatus: Props["status"]) => void;
  hideDelivered?: boolean; // new prop
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
  hideDelivered?: boolean;
}> = ({ value, onChange, hideDelivered = false }) => {
  const options = hideDelivered
    ? STATUS_OPTIONS.filter(option => option.value !== "delivered")
    : STATUS_OPTIONS;

  return (
    <Select
      value={value}
      style={{ width: 130 }}
      onChange={v => onChange(v as Props["status"])}
      options={options}
    />
  );
};

const MemoizedOrderStatusSelect = memo(OrderStatusSelect);

const EditableOrderStatus: React.FC<Props> = ({ status, onSave, hideDelivered }) => {
  return (
    <MemoizedOrderStatusSelect
      value={status}
      onChange={onSave}
      hideDelivered={hideDelivered} // pass prop
    />
  );
};

export default EditableOrderStatus;
