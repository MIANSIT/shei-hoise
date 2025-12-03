// app/components/admin/order/edit-order/UpdateOrderButton.tsx
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
  status: "pending" | "confirmed" | "delivered" | "cancelled" | "shipped"; // ✅ FIXED: "delivered" not "delivered"
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  disabled?: boolean;
  onOrderUpdated?: () => void;
  emailError?: string;
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
  emailError,
}: UpdateOrderButtonProps) {
  const { modal, notification } = App.useApp();
  const [isLoading, setIsLoading] = useState(false);

  const showConfirm = () => {
    // Prevent submission if there's an email error
    if (emailError) {
      notification.error({
        message: "Cannot Update Order",
        description: emailError,
      });
      return;
    }

    modal.confirm({
      title: "Confirm Order Update",
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical">
          <Text>Are you sure you want to update this order?</Text>
          <Text type="secondary">Order ID: {orderId}</Text>
          <Text type="secondary">Customer: {customerInfo.name}</Text>
          <Text type="secondary">Email: {customerInfo.email}</Text>
          <Text type="secondary">Subtotal: ৳{subtotal.toFixed(2)}</Text>
          <Text type="secondary">Discount: ৳{discount.toFixed(2)}</Text>
          <Text type="secondary">Delivery: ৳{deliveryCost.toFixed(2)}</Text>
          <Text type="secondary">Tax: ৳{taxAmount.toFixed(2)}</Text>
          <Text strong>Total Amount: ৳{totalAmount.toFixed(2)}</Text>
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
    if (disabled || emailError) return;

    setIsLoading(true);
    try {
      console.log("🔄 Starting order update process...", {
        storeId,
        orderId: originalOrder.id,
        orderNumber: orderId,
        customerInfo,
        orderProductsCount: orderProducts.length,
        financials: { subtotal, taxAmount, discount, deliveryCost, totalAmount },
        status,
        paymentStatus,
        paymentMethod
      });

      // Prepare the update data with CORRECT structure matching UpdateOrderByNumberData
      const updateData = {
        storeId,
        orderId: originalOrder.id, // Use the database order ID
        orderNumber: orderId, // Use the order number for reference
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
        orderProducts: orderProducts.map(product => ({
          product_id: product.product_id,
          variant_id: product.variant_id || null,
          product_name: product.product_name,
          variant_details: product.variant_details || {},
          quantity: product.quantity,
          unit_price: product.unit_price,
          total_price: product.total_price,
        })),
        subtotal: Number(subtotal),
        taxAmount: Number(taxAmount),
        discount: Number(discount), // ✅ INCLUDING discount amount
        deliveryCost: Number(deliveryCost),
        totalAmount: Number(totalAmount),
        status: status,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        currency: "BDT",
        deliveryOption: customerInfo.deliveryMethod || "",
      };

      console.log("📦 Sending update data with discount:", updateData);

      const result = await dataService.updateOrderByNumber(updateData);

      console.log("✅ Update response:", result);

      if (result.success) {
        notification.success({
          message: "Order Updated Successfully",
          description: `Order ${orderId} has been updated successfully with discount: ৳${discount.toFixed(2)}.`,
          duration: 4,
        });

        // Call the callback if provided
        if (onOrderUpdated) {
          console.log("🔄 Calling onOrderUpdated callback");
          onOrderUpdated();
        }
      } else {
        console.error("❌ Order update failed:", result.error);
        throw new Error(result.error || "Failed to update order");
      }
    } catch (error: any) {
      console.error("💥 Error updating order:", error);
      
      // Show more detailed error message
      let errorMessage = error.message || "Unknown error occurred. Please check the console for details.";
      
      // Handle specific error cases
      if (error.message?.includes("order not found")) {
        errorMessage = "Order not found. It may have been deleted.";
      } else if (error.message?.includes("permission denied")) {
        errorMessage = "You don't have permission to update this order.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      modal.error({
        title: "Order Update Failed",
        content: errorMessage,
        width: 400,
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
      disabled={disabled || isLoading || !!emailError}
      onClick={showConfirm}
      style={{ 
        minWidth: "140px",
        height: "40px",
        fontSize: "16px",
        fontWeight: "600"
      }}
    >
      {isLoading ? "Updating..." : "Update Order"}
    </Button>
  );
}