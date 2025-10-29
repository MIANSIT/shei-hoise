"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { OrderStatus } from "../../../../../../lib/types/order";

interface Props {
  status: OrderStatus;
  onSave: (newStatus: OrderStatus) => void;
  hideDelivered?: boolean;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const OrderStatusSelect: React.FC<{
  value: OrderStatus;
  onChange: (v: OrderStatus) => void;
  hideDelivered?: boolean;
}> = ({ value, onChange, hideDelivered = false }) => {
  const options = hideDelivered
    ? STATUS_OPTIONS.filter(option => option.value !== "delivered")
    : STATUS_OPTIONS;

  return (
    <Select
      value={value}
      style={{ width: 130 }}
      onChange={onChange}
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
      hideDelivered={hideDelivered}
    />
  );
};

export default EditableOrderStatus;