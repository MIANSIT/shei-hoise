"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { DeliveryOption } from "../../../../../../lib/types/enums"; // Change this import path

interface Props {
  option: DeliveryOption;
  onSave: (newOption: DeliveryOption) => void;
}

const DELIVERY_OPTIONS = [
  { value: "pathao", label: "Pathao" },
  { value: "courier", label: "Courier" },
  { value: "other", label: "Other" },
  { value: "inside dhaka", label: "Inside Dhaka" },
  { value: "outside dhaka", label: "Outside Dhaka" },
];

const DeliveryOptionSelect: React.FC<{
  value: DeliveryOption;
  onChange: (v: DeliveryOption) => void;
}> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      style={{ width: 130 }}
      onChange={onChange}
      options={DELIVERY_OPTIONS}
    />
  );
};

const MemoizedDeliveryOptionSelect = memo(DeliveryOptionSelect);

const EditableDeliveryOption: React.FC<Props> = ({ option, onSave }) => {
  return (
    <MemoizedDeliveryOptionSelect
      value={option}
      onChange={onSave}
    />
  );
};

export default EditableDeliveryOption;