/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button, Space, Typography, App } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dataService from "@/lib/queries/dataService";
import { getOrCreateCustomerByPhone } from "@/lib/queries/customers/getOrCreateCustomerByPhone";
import { OrderProduct, CustomerInfo } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
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
  courier?: string;
  orderDate: string;
  disabled?: boolean;
  onOrderUpdated?: () => void;
  emailError?: string;
  returnUrl?: string;
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
  courier,
  orderDate,
  disabled = false,
  onOrderUpdated,
  emailError,
  returnUrl,
}: UpdateOrderButtonProps) {
  const { modal, notification } = App.useApp();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const showConfirm = () => {
    if (emailError) {
      notification.error({
        title: "Cannot Update Order",
        description: emailError,
      });
      return;
    }

    modal.confirm({
      title: "Confirm Order Update",
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space orientation="vertical">
          <Text>Are you sure you want to update this order?</Text>
          <Text type="secondary">Order ID: {orderId}</Text>
          <Text type="secondary">Customer: {customerInfo.name}</Text>
          <Text type="secondary">Email: {customerInfo.email}</Text>
          <Text type="secondary">
            Address: {customerInfo.address}, {customerInfo.city}
          </Text>
          <Text type="secondary">Phone: {customerInfo.phone}</Text>
          <Text type="secondary">
            Subtotal: {displayCurrencyIconSafe}
            {subtotal.toFixed(2)}
          </Text>
          <Text type="secondary">
            Discount: {displayCurrencyIconSafe}
            {discount.toFixed(2)}
          </Text>
          <Text type="secondary">
            Additional Charges: {displayCurrencyIconSafe}
            {additionalCharges.toFixed(2)}
          </Text>
          <Text type="secondary">
            Delivery: {displayCurrencyIconSafe}
            {deliveryCost.toFixed(2)}
          </Text>
          <Text type="secondary">
            Tax: {displayCurrencyIconSafe}
            {taxAmount.toFixed(2)}
          </Text>
          <Text strong>
            Total Amount: {displayCurrencyIconSafe}
            {totalAmount.toFixed(2)}
          </Text>
          <Text type="warning">
            This will update all order details including products, pricing, and
            customer information.
          </Text>
          {!customerInfo.customer_id && (
            <Text type="warning">
              No customer is linked — a new customer record will be created
              and this order will be linked to it.
            </Text>
          )}
        </Space>
      ),
      okText: "Yes, Update Order",
      cancelText: "Cancel",
      onOk: handleUpdate,
    });
  };

  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  const displayCurrency = currencyLoading ? "" : (currency ?? "");
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback
  const displayCurrencySafe = displayCurrency || "BDT"; // fallback

  const handleUpdate = async () => {
    if (disabled || emailError) return;

    setIsLoading(true);
    try {
      // No customer linked — this is either a genuine "New Customer" save,
      // or (far more often) a Quick Sale walk-in order being re-opened here:
      // Quick Sale never creates a store_customers row for an anonymous
      // sale, so its shipping_address snapshot ("Walk-in Customer" / "N/A")
      // is all EditOrder has to show, and customer_id stays null. A phone
      // number is the only reliable signal that this is a real customer
      // worth a permanent record — "N/A" has none. Without this check, every
      // single save here re-ran createCustomer unconditionally and inserted
      // a brand-new duplicate "Walk-in Customer" row each time.
      let customerId = customerInfo.customer_id;
      if (!customerId) {
        const cleanedPhone = (customerInfo.phone || "").replace(/\D/g, "");
        if (cleanedPhone) {
          // Same find-or-create Quick Sale itself uses for a due sale —
          // reuses any existing store_customers row for this phone instead
          // of inserting a new one.
          const result = await getOrCreateCustomerByPhone(
            storeId,
            customerInfo.name || "",
            customerInfo.phone,
          );
          if (!result.customerId) {
            throw new Error(result.error || "Failed to resolve customer record");
          }
          customerId = result.customerId;

          notification.success({
            title: "Customer Linked",
            description: `Order linked to the customer record for ${customerInfo.phone}.`,
          });
        }
        // No real phone on file (anonymous walk-in) — leave customerId
        // null, exactly as Quick Sale itself would for the same order.
      }

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
          customer_id: customerId,
          country: customerInfo.country || "Bangladesh",
        },
        orderProducts: orderProducts.map((product) => ({
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
        courier: courier,
        orderDate,
        currency: displayCurrencySafe,
        deliveryOption: customerInfo.deliveryOption || "",
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
        },
      };

      const result = await dataService.updateOrderByNumber(updateData);

      if (result.success) {
        notification.success({
          title: "Order Updated Successfully",
          description: `Order ${orderId} has been updated with all customer details.`,
          duration: 4,
        });

        if (onOrderUpdated) {
          onOrderUpdated();
        }

        router.push(returnUrl || "/dashboard/orders");
      } else {
        console.error("❌ Order update failed:", result.error);
        throw new Error(result.error || "Failed to update order");
      }
    } catch (error: any) {
      console.error("💥 Error updating order:", error);

      let errorMessage =
        error.title ||
        "Unknown error occurred. Please check the console for details.";

      if (error.title?.includes("order not found")) {
        errorMessage = "Order not found. It may have been deleted.";
      } else if (error.title?.includes("permission denied")) {
        errorMessage = "You don't have permission to update this order.";
      } else if (error.title?.includes("network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
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
        fontWeight: "600",
      }}
    >
      {isLoading ? "Updating..." : "Update Order"}
    </Button>
  );
}
