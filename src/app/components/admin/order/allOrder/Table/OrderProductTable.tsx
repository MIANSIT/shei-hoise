"use client";

import React, { useState } from "react";
import { StoreOrder, OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "@/lib/types/order";
import OrderControls from "@/app/components/admin/order/allOrder/DropDown/OrderControls";

interface Props {
  order: StoreOrder;
  onSaveStatus: (newStatus: OrderStatus) => void;
  onSavePaymentStatus: (newStatus: PaymentStatus) => void;
  onSaveDeliveryOption?: (newOption: DeliveryOption) => void; // Make optional
  onSavePaymentMethod?: (newMethod: PaymentMethod) => void; // Make optional
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
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>(order.payment_status);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(
    order.delivery_option || "courier"
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    order.payment_method === "cod" ? "cod" : "online"
  );
  const [cancelNote, setCancelNote] = useState(order.notes || "");

  const isLocked = order.status === "delivered" || order.status === "cancelled";

  const handleSaveAll = () => {
    if (selectedStatus !== order.status) onSaveStatus(selectedStatus);
    if (selectedPaymentStatus !== order.payment_status) onSavePaymentStatus(selectedPaymentStatus);
    if (selectedDeliveryOption !== order.delivery_option && onSaveDeliveryOption) {
      onSaveDeliveryOption(selectedDeliveryOption);
    }
    if (selectedPaymentMethod !== (order.payment_method === "cod" ? "cod" : "online") && onSavePaymentMethod) {
      onSavePaymentMethod(selectedPaymentMethod);
    }
    if (cancelNote !== order.notes) onSaveCancelNote?.(cancelNote);
  };

  return (
    <div className="p-4 bg-blue-50 rounded-md space-y-4 border">
      <h3 className="font-semibold text-lg">Order Management</h3>
      <OrderControls
        status={order.status}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        paymentStatus={order.payment_status}
        selectedPaymentStatus={selectedPaymentStatus}
        onSelectPaymentStatus={setSelectedPaymentStatus}
        deliveryOption={order.delivery_option || "courier"}
        selectedDeliveryOption={selectedDeliveryOption}
        onSelectDeliveryOption={setSelectedDeliveryOption}
        paymentMethod={order.payment_method === "cod" ? "cod" : "online"}
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