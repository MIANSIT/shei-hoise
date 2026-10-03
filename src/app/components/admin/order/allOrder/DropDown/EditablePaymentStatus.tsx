"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { usePermissions } from "@/lib/context/PermissionsContext";
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
  canChange: boolean;
  canMarkPaid: boolean;
}> = ({ value, onChange, canChange, canMarkPaid }) => {
  // A role with only "collect due payment" may mark an order paid, nothing else.
  const options = canChange
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.map((option) => ({
        ...option,
        disabled: option.value !== value && !(option.value === "paid" && canMarkPaid),
      }));
  return (
    <Select
      value={value}
      style={{ width: 130 }}
      onChange={onChange}
      options={options}
      disabled={!canChange && !canMarkPaid}
    />
  );
};

const MemoizedPaymentStatusSelect = memo(PaymentStatusSelect);

const EditablePaymentStatus: React.FC<Props> = ({ status, onSave }) => {
  const { can } = usePermissions();
  return (
    <MemoizedPaymentStatusSelect
      value={status}
      onChange={onSave}
      canChange={can("orders.change_status")}
      canMarkPaid={can("customers.collect_payment")}
    />
  );
};

export default EditablePaymentStatus;