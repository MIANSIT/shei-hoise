"use client";

import React, { memo } from "react";
import { Select } from "antd";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { PaymentMethod } from "../../../../../../lib/types/enums";
import { useTranslation } from "../../../../../../lib/hook/useTranslation";

interface Props {
  method: PaymentMethod;
  onSave: (newMethod: PaymentMethod) => void;
}

const PaymentMethodSelect: React.FC<{
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const t = useTranslation();
  // Matches the Create/Edit Order and Quick Sale option sets so every
  // screen writes the same payment_method values into the same orders —
  // previously this list only offered "cod"/"online", so picking Cash,
  // Card or Mobile Banking here was impossible even though those are valid
  // enum values elsewhere in the app.
  const options = [
    { value: PaymentMethod.CASH, label: t.admin.orderPayCash },
    { value: PaymentMethod.COD, label: t.admin.orderCod },
    { value: PaymentMethod.MOBILE_BANKING, label: t.admin.orderPayMobileBanking },
    { value: PaymentMethod.BANK_TRANSFER, label: t.admin.moBankTransfer },
    // A split sale is only made in Quick Sale, where its amounts are entered;
    // here it is shown so it reads right, and can be changed to one method.
    ...(value === PaymentMethod.SPLIT ? [{ value: PaymentMethod.SPLIT, label: t.admin.orderPaySplit }] : []),
  ];
  return (
    <Select
      value={value === PaymentMethod.CARD ? PaymentMethod.BANK_TRANSFER : value}
      style={{ width: 150 }}
      onChange={onChange}
      options={options}
      disabled={disabled}
    />
  );
};

const MemoizedPaymentMethodSelect = memo(PaymentMethodSelect);

const EditablePaymentMethod: React.FC<Props> = ({ method, onSave }) => {
  const { can } = usePermissions();
  return (
    <MemoizedPaymentMethodSelect
      value={method}
      onChange={onSave}
      disabled={!can("orders.edit")}
    />
  );
};

export default EditablePaymentMethod;