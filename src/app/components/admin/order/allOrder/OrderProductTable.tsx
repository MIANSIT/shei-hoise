"use client";

import React, { useState } from "react";
import { Order, Product } from "@/lib/types/types";
import ProductListTable from "./ProductListTable";
import OrderControls from "./OrderControls";

interface Props {
  order: Order;
  onSaveStatus: (newStatus: Order["status"]) => void;
  onSavePaymentStatus: (newStatus: Order["paymentStatus"]) => void;
  onSaveDeliveryOption: (newOption: Order["deliveryOption"]) => void;
  onSavePaymentMethod: (newMethod: Order["paymentMethod"]) => void;
}

const OrderProductTable: React.FC<Props> = ({
  order,
  onSaveStatus,
  onSavePaymentStatus,
  onSaveDeliveryOption,
  onSavePaymentMethod,
}) => {
  // Add keys to products for table rows
  const productsWithKey: Product[] = order.products.map((p, idx) => ({
    ...p,
    key: `${order.id}-${idx}`,
  }));

  // Lock if delivered/cancelled and payment is paid
  const isLocked =
    (order.status === "delivered" || order.status === "cancelled") &&
    order.paymentStatus === "paid";

  // Local state for editable fields
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

  // Save changes if any
  const handleSaveAll = () => {
    if (selectedStatus !== order.status) onSaveStatus(selectedStatus);
    if (selectedPaymentStatus !== order.paymentStatus)
      onSavePaymentStatus(selectedPaymentStatus);
    if (selectedDeliveryOption !== order.deliveryOption)
      onSaveDeliveryOption(selectedDeliveryOption);
    if (selectedPaymentMethod !== order.paymentMethod)
      onSavePaymentMethod(selectedPaymentMethod);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-md space-y-4">
      {/* Product table with delivery & payment inside */}
      <ProductListTable products={productsWithKey} order={order} />

      {/* Editable controls for order */}
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
        isLocked={isLocked}
        onSaveAll={handleSaveAll}
      />
    </div>
  );
};

export default OrderProductTable;
