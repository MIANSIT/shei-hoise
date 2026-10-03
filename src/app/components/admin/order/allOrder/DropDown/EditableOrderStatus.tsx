"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { OrderStatus } from "../../../../../../lib/types/enums";

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
  { value: "returned", label: "Returned" },
];

const OrderStatusSelect: React.FC<{
  value: OrderStatus;
  onChange: (v: OrderStatus) => void;
  hideDelivered?: boolean;
  canChange: boolean;
  canCancel: boolean;
}> = ({ value, onChange, hideDelivered = false, canChange, canCancel }) => {
  const options = (hideDelivered
    ? STATUS_OPTIONS.filter(option => option.value !== "delivered")
    : STATUS_OPTIONS
  ).map((option) =>
    // Staff roles: only offer the moves their role allows.
    option.value === value
      ? option
      : { ...option, disabled: option.value === "cancelled" ? !canCancel : !canChange },
  );

  return (
    <Select
      value={value}
      style={{ width: 130 }}
      onChange={onChange}
      options={options}
      disabled={!canChange && !canCancel}
    />
  );
};

const MemoizedOrderStatusSelect = memo(OrderStatusSelect);

const EditableOrderStatus: React.FC<Props> = ({ status, onSave, hideDelivered }) => {
  const { can } = usePermissions();
  return (
    <MemoizedOrderStatusSelect
      value={status}
      onChange={onSave}
      hideDelivered={hideDelivered}
      canChange={can("orders.change_status")}
      canCancel={can("orders.cancel")}
    />
  );
};

export default EditableOrderStatus;