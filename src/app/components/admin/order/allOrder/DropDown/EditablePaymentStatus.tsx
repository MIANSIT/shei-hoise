"use client";

import React, { useState, useEffect, memo } from "react";
import { Select } from "antd";

interface Props {
  status: "paid" | "pending" | "failed";
  onSave: (newStatus: Props["status"]) => void; // now just updates parent state
}

const PAYMENT_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const PaymentStatusSelect: React.FC<{
  value: Props["status"];
  onChange: (v: Props["status"]) => void;
  disabled: boolean;
}> = ({ value, onChange, disabled }) => (
  <Select
    value={value}
    style={{ width: 130 }}
    onChange={v => onChange(v as Props["status"])}
    disabled={disabled}
    options={PAYMENT_OPTIONS}
  />
);

const MemoizedPaymentStatusSelect = memo(PaymentStatusSelect);

const EditablePaymentStatus: React.FC<Props> = ({ status, onSave }) => {
  const [selectedStatus, setSelectedStatus] = useState(status);
  const isLocked = status === "paid";

  // Update parent state whenever selection changes
  useEffect(() => {
    onSave(selectedStatus);
  }, [selectedStatus, onSave]);

  return (
    <MemoizedPaymentStatusSelect
      value={selectedStatus}
      onChange={setSelectedStatus}
      disabled={isLocked}
    />
  );
};

export default EditablePaymentStatus;
