/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
  PaymentMethod,
} from "@/lib/types/enums";
import { StoreOrder } from "@/lib/types/order";
import OrderControls from "@/app/components/admin/order/allOrder/DropDown/OrderControls";
import dataService from "@/lib/queries/dataService";
import { useSheiNotification } from "@/lib/hook/useSheiNotification"; // Adjust the import path

interface Props {
  order: StoreOrder;
  onSaveStatus: (newStatus: OrderStatus) => void;
  onSavePaymentStatus: (newStatus: PaymentStatus) => void;
  onSaveDeliveryOption?: (newOption: DeliveryOption) => void;
  onSavePaymentMethod?: (newMethod: PaymentMethod) => void;
  onSaveCancelNote?: (note: string) => void;
  onSaveShippingFee?: (fee: number) => void;
  onRefresh?: () => void;
}

const OrderProductTable: React.FC<Props> = ({
  order,
  onSaveStatus,
  onSavePaymentStatus,
  onSaveDeliveryOption,
  onSavePaymentMethod,
  onSaveCancelNote,
  onSaveShippingFee,
  onRefresh,
}) => {
  const notify = useSheiNotification(); // ✅ Using custom notification hook
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    order.status
  );
  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<PaymentStatus>(order.payment_status);
  const [selectedDeliveryOption, setSelectedDeliveryOption] =
    useState<DeliveryOption>(order.delivery_option ?? DeliveryOption.COURIER);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>((order.payment_method as PaymentMethod) || "cod");
  const [selectedShippingFee, setSelectedShippingFee] = useState<number>(
    order.shipping_fee
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

      if (
        selectedDeliveryOption !== order.delivery_option &&
        onSaveDeliveryOption
      ) {
        updateData.delivery_option = selectedDeliveryOption;
      }

      if (
        selectedPaymentMethod !== order.payment_method &&
        onSavePaymentMethod
      ) {
        updateData.payment_method = selectedPaymentMethod;
      }

      if (selectedShippingFee !== order.shipping_fee && onSaveShippingFee) {
        updateData.shipping_fee = selectedShippingFee;
        const discountAmount = (order as any).discount_amount || 0;
        updateData.total_amount =
          order.subtotal -
          discountAmount +
          order.tax_amount +
          selectedShippingFee;
      }

      if (cancelNote !== order.notes) {
        updateData.notes = cancelNote;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        const result = await dataService.updateOrder(order.id, updateData);

        if (result.success) {
          // ✅ Use custom notification hook
          notify.success("Order updated successfully!", { duration: 3000 });

          // Update local state through parent callbacks
          if (selectedStatus !== order.status) onSaveStatus(selectedStatus);
          if (selectedPaymentStatus !== order.payment_status)
            onSavePaymentStatus(selectedPaymentStatus);
          if (
            selectedDeliveryOption !== order.delivery_option &&
            onSaveDeliveryOption
          ) {
            onSaveDeliveryOption(selectedDeliveryOption);
          }
          if (
            selectedPaymentMethod !== order.payment_method &&
            onSavePaymentMethod
          ) {
            onSavePaymentMethod(selectedPaymentMethod);
          }
          if (selectedShippingFee !== order.shipping_fee && onSaveShippingFee) {
            onSaveShippingFee(selectedShippingFee);
          }
          if (cancelNote !== order.notes) onSaveCancelNote?.(cancelNote);

          // Trigger a complete refresh of orders and statistics
          if (onRefresh) {
            onRefresh();
          }
        } else {
          // ✅ Use custom notification hook
          notify.error(`Failed to update order: ${result.error}`, {
            duration: 5000,
          });
          revertChanges();
        }
      } else {
        // ✅ Use custom notification hook
        notify.info("No changes to save.", { duration: 2000 });
      }
    } catch (err: any) {
      console.error("Error saving order changes:", err);
      // ✅ Use custom notification hook
      notify.error(err.message || "Failed to save changes. Please try again.", {
        duration: 5000,
      });
      revertChanges();
    } finally {
      setSaving(false);
    }
  };

  const revertChanges = () => {
    setSelectedStatus(order.status);
    setSelectedPaymentStatus(order.payment_status);
    setSelectedDeliveryOption(order.delivery_option ?? DeliveryOption.COURIER);
    setSelectedPaymentMethod((order.payment_method as PaymentMethod) || "cod");
    setSelectedShippingFee(order.shipping_fee);
    setCancelNote(order.notes || "");
  };

  return (
    <div className="p-3 sm:p-4 rounded-md space-y-3 sm:space-y-4 border">
      <h3 className="font-semibold text-base sm:text-lg">Order Management</h3>
      <OrderControls
        status={order.status}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        paymentStatus={order.payment_status}
        selectedPaymentStatus={selectedPaymentStatus}
        onSelectPaymentStatus={setSelectedPaymentStatus}
        deliveryOption={order.delivery_option ?? DeliveryOption.COURIER}
        selectedDeliveryOption={selectedDeliveryOption}
        onSelectDeliveryOption={setSelectedDeliveryOption}
        paymentMethod={(order.payment_method as PaymentMethod) || "cod"}
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
