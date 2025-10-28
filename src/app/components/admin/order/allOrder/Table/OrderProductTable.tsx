/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { App } from "antd"; // Remove message import
import { StoreOrder, OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "@/lib/types/order";
import OrderControls from "@/app/components/admin/order/allOrder/DropDown/OrderControls";
import dataService from "@/lib/queries/dataService";

interface Props {
  order: StoreOrder;
  onSaveStatus: (newStatus: OrderStatus) => void;
  onSavePaymentStatus: (newStatus: PaymentStatus) => void;
  onSaveDeliveryOption?: (newOption: DeliveryOption) => void;
  onSavePaymentMethod?: (newMethod: PaymentMethod) => void;
  onSaveCancelNote?: (note: string) => void;
  onRefresh?: () => void;
}

const OrderProductTable: React.FC<Props> = ({
  order,
  onSaveStatus,
  onSavePaymentStatus,
  onSaveDeliveryOption,
  onSavePaymentMethod,
  onSaveCancelNote,
  onRefresh,
}) => {
  const { notification, message } = App.useApp(); // Get both notification and message
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>(order.payment_status);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(
    order.delivery_option || "courier"
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    order.payment_method === "cod" ? "cod" : "online"
  );
  const [cancelNote, setCancelNote] = useState(order.notes || "");
  const [saving, setSaving] = useState(false);

  const isLocked = order.status === "delivered" || order.status === "cancelled";

  const handleSaveAll = async () => {
    if (saving) return;

    setSaving(true);
    try {
      // Prepare update data
      const updateData: any = {};
      
      if (selectedStatus !== order.status) {
        updateData.status = selectedStatus;
      }
      
      if (selectedPaymentStatus !== order.payment_status) {
        updateData.payment_status = selectedPaymentStatus;
      }
      
      if (selectedDeliveryOption !== order.delivery_option && onSaveDeliveryOption) {
        updateData.delivery_option = selectedDeliveryOption;
      }
      
      if (selectedPaymentMethod !== (order.payment_method === "cod" ? "cod" : "online") && onSavePaymentMethod) {
        updateData.payment_method = selectedPaymentMethod;
      }
      
      if (cancelNote !== order.notes) {
        updateData.notes = cancelNote;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        console.log('Saving order updates:', { orderId: order.id, updateData });
        
        const result = await dataService.updateOrder(order.id, updateData);
        
        if (result.success) {
          message.success('Order updated successfully!');
          
          // Update local state through parent callbacks
          if (selectedStatus !== order.status) onSaveStatus(selectedStatus);
          if (selectedPaymentStatus !== order.payment_status) onSavePaymentStatus(selectedPaymentStatus);
          if (selectedDeliveryOption !== order.delivery_option && onSaveDeliveryOption) {
            onSaveDeliveryOption(selectedDeliveryOption);
          }
          if (selectedPaymentMethod !== (order.payment_method === "cod" ? "cod" : "online") && onSavePaymentMethod) {
            onSavePaymentMethod(selectedPaymentMethod);
          }
          if (cancelNote !== order.notes) onSaveCancelNote?.(cancelNote);
          
          // Refresh the orders list
          if (onRefresh) {
            setTimeout(() => {
              onRefresh();
            }, 500);
          }
        } else {
          message.error(`Failed to update order: ${result.error}`);
          // Revert local state changes on error
          setSelectedStatus(order.status);
          setSelectedPaymentStatus(order.payment_status);
          setSelectedDeliveryOption(order.delivery_option || "courier");
          setSelectedPaymentMethod(order.payment_method === "cod" ? "cod" : "online");
          setCancelNote(order.notes || "");
        }
      } else {
        message.info('No changes to save.');
      }
    } catch (error: any) {
      console.error('Error saving order changes:', error);
      message.error('Failed to save changes. Please try again.');
      // Revert local state changes on error
      setSelectedStatus(order.status);
      setSelectedPaymentStatus(order.payment_status);
      setSelectedDeliveryOption(order.delivery_option || "courier");
      setSelectedPaymentMethod(order.payment_method === "cod" ? "cod" : "online");
      setCancelNote(order.notes || "");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-blue-50 rounded-md space-y-3 sm:space-y-4 border">
      <h3 className="font-semibold text-base sm:text-lg">Order Management</h3>
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
        saving={saving}
      />
    </div>
  );
};

export default OrderProductTable;