/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button, Space, Typography, App } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dataService from "@/lib/queries/dataService";
import { OrderProduct, CustomerInfo } from "@/lib/types/order";
import { useRouter } from "next/navigation";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // ✅ ADDED: Import enums
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
const { Text } = Typography;

interface SaveOrderButtonProps {
  storeId: string;
  orderId: string;
  orderProducts: OrderProduct[];
  customerInfo: CustomerInfo;
  subtotal: number;
  taxAmount: number;
  discount: number;
  additionalCharges: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus; // ✅ CHANGED: Use enum
  paymentStatus: PaymentStatus; // ✅ CHANGED: Use enum
  paymentMethod: string;
  disabled?: boolean;
  onCustomerCreated?: () => void;
  emailError?: string;
}

export default function SaveOrderButton({
  storeId,
  orderId,
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
  onCustomerCreated,
  emailError,
}: SaveOrderButtonProps) {
  const { modal, notification } = App.useApp();
  const t = useTranslation();
  const n = useLocalNum();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const {
    currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const showConfirm = () => {
    if (emailError) {
      notification.error({
        message: t.admin.saveOrderCannotCreate,
        description: emailError,
      });
      return;
    }

    modal.confirm({
      title: t.admin.saveOrderConfirmTitle,
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space orientation="vertical">
          <Text>{t.admin.saveOrderConfirmMsg}</Text>
          <Text type="secondary">{t.admin.saveOrderOrderIdLabel} {orderId}</Text>
          <Text type="secondary">{t.admin.saveOrderConfirmCustomer} {customerInfo.name}</Text>
          {customerInfo.email && (
            <Text type="secondary">{t.admin.saveOrderConfirmEmail} {customerInfo.email}</Text>
          )}
          <Text type="secondary">
            {t.admin.saveOrderConfirmSubtotal} {displayCurrencyIconSafe}
            {n(subtotal.toFixed(2))}
          </Text>
          <Text type="secondary">
            {t.admin.saveOrderConfirmDiscount} {displayCurrencyIconSafe}
            {n(discount.toFixed(2))}
          </Text>
          <Text type="secondary">
            {t.admin.saveOrderConfirmAdditional} {displayCurrencyIconSafe}
            {n(additionalCharges.toFixed(2))}
          </Text>
          <Text type="secondary">
            {t.admin.saveOrderConfirmDelivery} {displayCurrencyIconSafe}
            {n(deliveryCost.toFixed(2))}
          </Text>
          <Text type="secondary">
            {t.admin.saveOrderConfirmTax} {displayCurrencyIconSafe}
            {n(taxAmount.toFixed(2))}
          </Text>
          <Text strong>
            {t.admin.saveOrderConfirmTotal} {displayCurrencyIconSafe}
            {n(totalAmount.toFixed(2))}
          </Text>
          {!customerInfo.customer_id && (
            <Text type="warning">
              {t.admin.saveOrderConfirmNewCust}
            </Text>
          )}
        </Space>
      ),
      okText: t.admin.saveOrderConfirmOk,
      cancelText: t.admin.saveOrderConfirmCancel,
      onOk: handleSave,
    });
  };

  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  const displayCurrency = currencyLoading ? "" : (currency ?? "");
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback
  const displayCurrencySafe = displayCurrency || "BDT"; // fallback

  const handleSave = async () => {
    if (disabled || emailError) return;

    setIsLoading(true);
    try {
      const finalCustomerInfo = { ...customerInfo };
      let customerCreated = false;

      if (!customerInfo.customer_id && !emailError) {
        try {
          if (!customerInfo.name || !customerInfo.phone) {
            throw new Error(
              "Customer name and phone are required to create a customer record",
            );
          }

          const newCustomer = await dataService.createCustomer({
            store_id: storeId,
            email: customerInfo.email || undefined,
            first_name: customerInfo.name,
            phone: customerInfo.phone,
            address_line_1: customerInfo.address,
            city: customerInfo.city,
            country: "Bangladesh",
            postal_code: customerInfo.postal_code,
          });

          if (!newCustomer || !newCustomer.id) {
            throw new Error(
              "Customer creation failed - no customer ID returned",
            );
          }

          finalCustomerInfo.customer_id = newCustomer.id;
          customerCreated = true;

          if (onCustomerCreated) {
            onCustomerCreated();
          }

          notification.success({
            message: t.admin.saveOrderCustCreatedTitle,
            description: t.admin.saveOrderCustCreatedDesc,
          });
        } catch (customerError: any) {
          console.error("Error creating customer:", customerError);

          const shouldContinue = await new Promise((resolve) => {
            modal.confirm({
              title: t.admin.saveOrderCustFailedTitle,
              content: (
                <Space orientation="vertical">
                  <Text>
                    {t.admin.saveOrderCustFailedDesc} {customerError.message}
                  </Text>
                  <Text type="warning">
                    {t.admin.saveOrderCustFailedWarning}
                  </Text>
                  <Text type="secondary">
                    {t.admin.saveOrderCustFailedNote}
                  </Text>
                </Space>
              ),
              okText: t.admin.saveOrderContinueWithout,
              cancelText: t.admin.saveOrderCancelOrder,
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });

          if (!shouldContinue) {
            setIsLoading(false);
            return;
          }
        }
      }

      const orderData = {
        storeId,
        orderNumber: orderId,
        customerInfo: finalCustomerInfo,
        orderProducts,
        subtotal,
        taxAmount,
        discount,
        additionalCharges,
        deliveryCost,
        totalAmount,
        status,
        paymentStatus,
        paymentMethod,
        currency: displayCurrencySafe,
        deliveryOption: finalCustomerInfo.deliveryOption,
      };

      const result = await dataService.createOrder(orderData);

      if (result.success) {
        let successMessage = `${t.admin.saveOrderOrderIdLabel} ${orderId} ${t.admin.saveOrderCreatedSuccess}`;
        if (customerCreated) {
          successMessage += ` ${t.admin.saveOrderNewCustNote}`;
        } else if (!customerInfo.customer_id) {
          successMessage += ` ${t.admin.saveOrderNoCustNote}`;
        }

        modal.success({
          title: t.admin.saveOrderSuccessTitle,
          content: (
            <Space orientation="vertical">
              <Text>{successMessage}</Text>
              <Text type="secondary">{t.admin.saveOrderOrderIdLabel} {result.orderId}</Text>
              {customerInfo.email && (
                <Text type="secondary">
                  {t.admin.saveOrderCustEmailLabel} {customerInfo.email}
                </Text>
              )}
              <Text type="secondary">
                {t.admin.saveOrderDiscountApplied} {displayCurrencyIconSafe}
                {n(discount.toFixed(2))}
              </Text>
              <Text type="secondary">
                {t.admin.saveOrderAdditionalLabel} {displayCurrencyIconSafe}
                {n(additionalCharges.toFixed(2))}
              </Text>
              <Text strong>
                {t.admin.saveOrderTotalLabel} {displayCurrencyIconSafe}
                {n(totalAmount.toFixed(2))}
              </Text>
            </Space>
          ),
          onOk: () => {
            router.push("/dashboard/orders");
          },
        });
      } else {
        console.error("Order creation failed:", result.error);
        throw new Error(result.error || "Failed to save order");
      }
    } catch (error: any) {
      console.error("Error saving order:", error);
      modal.error({
        title: t.admin.saveOrderFailedTitle,
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
      disabled={disabled || !!emailError}
      onClick={showConfirm}
      style={{ minWidth: "120px" }}
    >
      {isLoading ? t.admin.saveOrderCreating : t.admin.saveOrderBtn}
    </Button>
  );
}
