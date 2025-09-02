"use client";

import React, { memo } from "react";
import { Select } from "antd";

interface Props {
  option: "Pathao" | "Courier" | "Other";
  onSave: (newOption: Props["option"]) => void;
}

const DELIVERY_OPTIONS = [
  { value: "Pathao", label: "Pathao" },
  { value: "Courier", label: "Courier" },
  { value: "Other", label: "Other" },
];

const DeliveryOptionSelect: React.FC<Props> = ({ option, onSave }) => (
  <Select
    value={option}
    style={{ width: 130 }}
    onChange={v => onSave(v as Props["option"])}
    options={DELIVERY_OPTIONS}
  />
);

export default memo(DeliveryOptionSelect);
