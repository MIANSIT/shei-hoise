"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { DeliveryOption } from "../../../../../../lib/types/order";

interface Props {
  option: DeliveryOption;
  onSave: (newOption: DeliveryOption) => void;
}

const DELIVERY_OPTIONS = [
  { value: "pathao", label: "Pathao" },
  { value: "courier", label: "Courier" },
  { value: "other", label: "Other" },
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