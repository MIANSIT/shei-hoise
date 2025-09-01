"use client";

import React, { memo } from "react";
import { Select } from "antd";

interface Props {
  method: "COD" | "Online";
  onSave: (newMethod: Props["method"]) => void;
}

const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "Online", label: "Online Payment" },
];

const PaymentMethodSelect: React.FC<Props> = ({ method, onSave }) => (
  <Select
    value={method}
    style={{ width: 150 }}
    onChange={v => onSave(v as Props["method"])}
    options={PAYMENT_METHODS}
  />
);

export default memo(PaymentMethodSelect);
