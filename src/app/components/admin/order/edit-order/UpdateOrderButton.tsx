/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button, Space, Typography, App } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dataService from "@/lib/queries/dataService";
import { OrderProduct, CustomerInfo } from "@/lib/types/order";

const { Text } = Typography;

interface UpdateOrderButtonProps {
  storeId: string;
  orderId: string;
  originalOrder: any;
  orderProducts: OrderProduct[];
  customerInfo: CustomerInfo;
  subtotal: number;
  taxAmount: number;
  discount: number;
  deliveryCost: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "shipped";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  disabled?: boolean;
  onOrderUpdated?: () => void;
}

export default function UpdateOrderButton({
  storeId,
  orderId,
  originalOrder,
  orderProducts,
  customerInfo,
  subtotal,
  taxAmount,
  discount,
  deliveryCost,
  totalAmount,
  status,
  paymentStatus,
  paymentMethod,
  disabled = false,
  onOrderUpdated,
}: UpdateOrderButtonProps) {
  const { modal, notification } = App.useApp();
  const [isLoading, setIsLoading] = useState(false);

  const showConfirm = () => {
    modal.confirm({
      title: "Confirm Order Update",
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical">
          <Text>Are you sure you want to update this order?</Text>
          <Text type="secondary">Order ID: {orderId}</Text>
          <Text type="secondary">Customer: {customerInfo.name}</Text>
          <Text type="secondary">Total Amount: ৳{totalAmount.toFixed(2)}</Text>
          <Text type="warning">
            This will update all order details including products, pricing, and
            customer information.
          </Text>
        </Space>
      ),
      okText: "Yes, Update Order",
      cancelText: "Cancel",
      onOk: handleUpdate,
    });
  };

  const handleUpdate = async () => {
    if (disabled) return;

    setIsLoading(true);
    try {
      const updateData = {
        storeId,
        orderId: originalOrder.id,
        orderNumber: orderId,
        customerInfo: {
          name: customerInfo.name || "",
          phone: customerInfo.phone || "",
          address: customerInfo.address || "",
          deliveryMethod: customerInfo.deliveryMethod || "",
          deliveryOption: customerInfo.deliveryOption || "",
          city: customerInfo.city || "",
          email: customerInfo.email || "",
          notes: customerInfo.notes || "",
          postal_code: customerInfo.postal_code || "",
          customer_id: customerInfo.customer_id,
        },
        orderProducts,
        subtotal,
        taxAmount,
        discount,
        deliveryCost,
        totalAmount,
        status,
        paymentStatus,
        paymentMethod,
        currency: "BDT" as const,
        deliveryOption: customerInfo.deliveryMethod || "",
      };

      const result = await dataService.updateOrderByNumber(updateData);

      if (result.success) {
        notification.success({
          message: "Order Updated Successfully",
          description: `Order ${orderId} has been updated successfully.`,
        });

        if (onOrderUpdated) {
          onOrderUpdated();
        }
      } else {
        console.error("Order update failed:", result.error);
        throw new Error(result.error || "Failed to update order");
      }
    } catch (error: any) {
      console.error("Error updating order:", error);
      modal.error({
        title: "Order Update Failed",
        content:
          error.message ||
          "Unknown error occurred. Please check the console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      size="large"
      loading={isLoading}
      disabled={disabled}
      onClick={showConfirm}
      style={{ minWidth: "120px" }}
    >
      {isLoading ? "Updating..." : "Update Order"}
    </Button>
  );
}
