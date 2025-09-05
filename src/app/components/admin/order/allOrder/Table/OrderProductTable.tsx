"use client";

import React, { useState } from "react";
import { Order } from "@/lib/types/types";
import OrderControls from "@/app/components/admin/order/allOrder/DropDown/OrderControls";

interface Props {
  order: Order;
  onSaveStatus: (newStatus: Order["status"]) => void;
  onSavePaymentStatus: (newStatus: Order["paymentStatus"]) => void;
  onSaveDeliveryOption: (newOption: Order["deliveryOption"]) => void;
  onSavePaymentMethod: (newMethod: Order["paymentMethod"]) => void;
  onSaveCancelNote?: (note: string) => void;
}

const OrderProductTable: React.FC<Props> = ({
  order,
  onSaveStatus,
  onSavePaymentStatus,
  onSaveDeliveryOption,
  onSavePaymentMethod,
  onSaveCancelNote,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<Order["status"]>(
    order.status
  );
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<
    Order["paymentStatus"]
  >(order.paymentStatus);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<
    Order["deliveryOption"]
  >(order.deliveryOption);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    Order["paymentMethod"]
  >(order.paymentMethod);
  const [cancelNote, setCancelNote] = useState(order.cancelNote || "");

  const isLocked =
    (order.status === "delivered" || order.status === "cancelled") &&
    order.paymentStatus === "paid";

  const handleSaveAll = () => {
    if (selectedStatus !== order.status) onSaveStatus(selectedStatus);
    if (selectedPaymentStatus !== order.paymentStatus)
      onSavePaymentStatus(selectedPaymentStatus);
    if (selectedDeliveryOption !== order.deliveryOption)
      onSaveDeliveryOption(selectedDeliveryOption);
    if (selectedPaymentMethod !== order.paymentMethod)
      onSavePaymentMethod(selectedPaymentMethod);
    if (cancelNote !== order.cancelNote) onSaveCancelNote?.(cancelNote);
  };

  return (
    <div className="p-4  rounded-md space-y-4">
      <OrderControls
        status={order.status}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        paymentStatus={order.paymentStatus}
        selectedPaymentStatus={selectedPaymentStatus}
        onSelectPaymentStatus={setSelectedPaymentStatus}
        deliveryOption={order.deliveryOption}
        selectedDeliveryOption={selectedDeliveryOption}
        onSelectDeliveryOption={setSelectedDeliveryOption}
        paymentMethod={order.paymentMethod}
        selectedPaymentMethod={selectedPaymentMethod}
        onSelectPaymentMethod={setSelectedPaymentMethod}
        cancelNote={cancelNote}
        onSelectCancelNote={setCancelNote}
        isLocked={isLocked}
        onSaveAll={handleSaveAll}
      />
    </div>
  );
};

export default OrderProductTable;
