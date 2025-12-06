/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button, Space, Typography, App } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dataService from "@/lib/queries/dataService";
import { OrderProduct, CustomerInfo } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums

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
  additionalCharges: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus; // ✅ Using enum
  paymentStatus: PaymentStatus; // ✅ Using enum
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
  additionalCharges,
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
          <Text type="secondary">Address: {customerInfo.address}, {customerInfo.city}</Text>
          <Text type="secondary">Phone: {customerInfo.phone}</Text>
          <Text type="secondary">Subtotal: ৳{subtotal.toFixed(2)}</Text>
          <Text type="secondary">Discount: ৳{discount.toFixed(2)}</Text>
          <Text type="secondary">Additional Charges: ৳{additionalCharges.toFixed(2)}</Text>
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
        financials: { 
          subtotal, 
          taxAmount, 
          discount, 
          additionalCharges,
          deliveryCost, 
          totalAmount 
        },
        status,
        paymentStatus,
        paymentMethod
      });

      // Prepare the update data with COMPLETE shipping address
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
          country: customerInfo.country || "Bangladesh",
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
        discount: Number(discount),
        additionalCharges: Number(additionalCharges),
        deliveryCost: Number(deliveryCost),
        totalAmount: Number(totalAmount),
        status: status, // ✅ Already using enum
        paymentStatus: paymentStatus, // ✅ Already using enum
        paymentMethod: paymentMethod,
        currency: "BDT",
        deliveryOption: customerInfo.deliveryMethod || "",
        // ✅ ADDED: Shipping address object for the backend
        shippingAddress: {
          customer_name: customerInfo.name || "",
          phone: customerInfo.phone || "",
          email: customerInfo.email || "",
          address_line_1: customerInfo.address || "",
          address: customerInfo.address || "", // For backward compatibility
          city: customerInfo.city || "",
          postal_code: customerInfo.postal_code || "",
          country: customerInfo.country || "Bangladesh",
          deliveryOption: customerInfo.deliveryOption || "",
          deliveryMethod: customerInfo.deliveryMethod || "",
        }
      };

      console.log("📦 Sending update data with complete address:", {
        ...updateData,
        customerInfo: {
          ...updateData.customerInfo,
          address: customerInfo.address,
          city: customerInfo.city,
          postal_code: customerInfo.postal_code,
          country: customerInfo.country
        },
        shippingAddress: updateData.shippingAddress
      });

      const result = await dataService.updateOrderByNumber(updateData);

      console.log("✅ Update response:", result);

      if (result.success) {
        notification.success({
          message: "Order Updated Successfully",
          description: `Order ${orderId} has been updated with all customer details.`,
          duration: 4,
        });

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
      
      let errorMessage = error.message || "Unknown error occurred. Please check the console for details.";
      
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