"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { PaymentStatus } from "../../../../../../lib/types/enums";

interface Props {
  status: PaymentStatus;
  onSave: (newStatus: PaymentStatus) => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const PaymentStatusSelect: React.FC<{
  value: PaymentStatus;
  onChange: (v: PaymentStatus) => void;
}> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      style={{ width: 130 }}
      onChange={onChange}
      options={STATUS_OPTIONS}
    />
  );
};

const MemoizedPaymentStatusSelect = memo(PaymentStatusSelect);

const EditablePaymentStatus: React.FC<Props> = ({ status, onSave }) => {
  return (
    <MemoizedPaymentStatusSelect
      value={status}
      onChange={onSave}
    />
  );
};

export default EditablePaymentStatus;