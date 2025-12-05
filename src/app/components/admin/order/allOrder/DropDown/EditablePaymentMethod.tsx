"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { PaymentMethod } from "../../../../../../lib/types/enums";

interface Props {
  method: PaymentMethod;
  onSave: (newMethod: PaymentMethod) => void;
}

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "online", label: "Online Payment" },
];

const PaymentMethodSelect: React.FC<{
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      style={{ width: 150 }}
      onChange={onChange}
      options={PAYMENT_METHODS}
    />
  );
};

const MemoizedPaymentMethodSelect = memo(PaymentMethodSelect);

const EditablePaymentMethod: React.FC<Props> = ({ method, onSave }) => {
  return (
    <MemoizedPaymentMethodSelect
      value={method}
      onChange={onSave}
    />
  );
};

export default EditablePaymentMethod;