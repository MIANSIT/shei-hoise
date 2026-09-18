"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { PaymentMethod } from "../../../../../../lib/types/enums";
import { useTranslation } from "../../../../../../lib/hook/useTranslation";

interface Props {
  method: PaymentMethod;
  onSave: (newMethod: PaymentMethod) => void;
}

const PaymentMethodSelect: React.FC<{
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}> = ({ value, onChange }) => {
  const t = useTranslation();
  // Matches the Create/Edit Order and Quick Sale option sets so every
  // screen writes the same payment_method values into the same orders —
  // previously this list only offered "cod"/"online", so picking Cash,
  // Card or Mobile Banking here was impossible even though those are valid
  // enum values elsewhere in the app.
  const options = [
    { value: PaymentMethod.CASH, label: t.admin.orderPayCash },
    { value: PaymentMethod.COD, label: t.admin.orderCod },
    { value: PaymentMethod.CARD, label: t.admin.orderPayCard },
    { value: PaymentMethod.MOBILE_BANKING, label: t.admin.orderPayMobileBanking },
  ];
  return (
    <Select
      value={value}
      style={{ width: 150 }}
      onChange={onChange}
      options={options}
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