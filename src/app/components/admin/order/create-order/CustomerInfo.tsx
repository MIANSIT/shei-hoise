/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Card, Row, Col, Space, Typography, Alert } from "antd";
import { CustomerInfo as CustomerInfoType } from "@/lib/types/order";
import type { ShippingFee } from "@/lib/types/store/store";
import FormField from "@/app/components/admin/dashboard/products/addProducts/FormField";

const { Title, Text } = Typography;

interface CustomerInfoProps {
  customerInfo: CustomerInfoType;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfoType>>;
  onEmailChange: (email: string) => void;
  emailError?: string;
  orderId: string;
  isExistingCustomer?: boolean;
  shippingFees?: ShippingFee[];
  settingsLoading?: boolean;
}

export default function CustomerInfo({
  customerInfo,
  setCustomerInfo,
  onEmailChange,
  emailError,
  orderId,
  isExistingCustomer = false,
  shippingFees = [],
  settingsLoading = false,
}: CustomerInfoProps) {
  const validatePhone = (phone: string) => {
    const phoneRegex = /^(?:\+88|01)?\d{9,11}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const [touchedFields, setTouchedFields] = React.useState<
    Partial<Record<keyof CustomerInfoType, boolean>>
  >({});

  const handleFieldChange = (field: keyof CustomerInfoType, value: any) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    if (field === "email") onEmailChange(value);
  };

  const validShippingFees = React.useMemo(() => {
    if (!Array.isArray(shippingFees)) return [];
    return shippingFees.filter(
      (fee) =>
        fee &&
        typeof fee === "object" &&
        fee.name &&
        typeof fee.name === "string" &&
        fee.name.trim() !== "" &&
        typeof fee.price === "number"
    );
  }, [shippingFees]);

  const showPhoneError =
    touchedFields.phone &&
    (!customerInfo.phone || !validatePhone(customerInfo.phone));

  const showEmailError =
    touchedFields.email && (!customerInfo.email || emailError);

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Customer Information
            </Title>
            {isExistingCustomer && (
              <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                Existing Customer
              </Text>
            )}
          </div>

          <FormField name="orderId" label="Order ID" value={orderId} readOnly />

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="name"
                label="Customer Name"
                placeholder="Enter customer name"
                required
                tooltip="Enter the full name of the customer as it appears on official documents or for delivery purposes."
                value={customerInfo.name}
                onChange={(val) => handleFieldChange("name", val)}
              />
              {touchedFields.name && !customerInfo.name && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  Customer name is required
                </Text>
              )}
            </Col>
            <Col xs={24} md={12}>
              <FormField
                name="email"
                label="Customer Email"
                placeholder="customer@example.com"
                required
                tooltip="Enter a valid email address. Used for order confirmation and communication. Ensure it’s unique unless linking to an existing customer."
                value={customerInfo.email}
                onChange={(val) => handleFieldChange("email", val)}
              />
              {showEmailError && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {emailError || "Email is required"}
                </Text>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="phone"
                label="Customer Phone"
                placeholder="017********"
                required
                tooltip="Enter a valid phone number, e.g., 017XXXXXXXX. Include country code if necessary for international deliveries."
                value={customerInfo.phone}
                onChange={(val) => handleFieldChange("phone", val)}
              />
              {showPhoneError && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {!customerInfo.phone
                    ? "Phone number is required"
                    : "Please enter a valid phone number"}
                </Text>
              )}
            </Col>
          </Row>

          <FormField
            name="address"
            label="Customer Address"
            placeholder="Enter complete address"
            as="textarea"
            required
            tooltip="Enter the complete delivery address including street, house number, and any landmarks to ensure accurate delivery."
            value={customerInfo.address}
            onChange={(val) => handleFieldChange("address", val)}
          />
          {touchedFields.address && !customerInfo.address && (
            <Text type="danger" style={{ fontSize: 12 }}>
              Address is required
            </Text>
          )}

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="city"
                label="City"
                placeholder="Enter city (e.g., Dhaka, Chittagong, Sylhet)"
                required
                tooltip="Enter the city where the order will be delivered, e.g., Dhaka, Chittagong."
                value={customerInfo.city}
                onChange={(val) => handleFieldChange("city", val)}
              />
              {touchedFields.city && !customerInfo.city && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  City is required
                </Text>
              )}
            </Col>
            <Col xs={24} md={12}>
              <FormField
                name="postal_code"
                tooltip="Provide the postal or ZIP code for the delivery address to assist with accurate shipping."
                label="Postal Code"
                placeholder="Enter postal code (e.g., 1200, 1216)"
                required
                value={customerInfo.postal_code || ""}
                onChange={(val) => handleFieldChange("postal_code", val)}
              />
              {touchedFields.postal_code && !customerInfo.postal_code && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  Postal code is required
                </Text>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="deliveryOption"
                label="Delivery City Option"
                tooltip="Select the city-specific delivery option. This determines the shipping fees and available delivery partners."
                as="select"
                required
                placeholder="Select delivery option"
                options={validShippingFees.map((fee) => ({
                  label: fee.name,
                  value: fee.name.toLowerCase().replace(/\s+/g, "-"),
                }))}
                value={customerInfo.deliveryOption}
                onChange={(val) => handleFieldChange("deliveryOption", val)}
                disabled={settingsLoading}
              />
              {touchedFields.deliveryOption && !customerInfo.deliveryOption && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  Delivery option is required
                </Text>
              )}
            </Col>
            <Col xs={24} md={12}>
              <FormField
                name="deliveryMethod"
                label="Delivery Method"
                tooltip="Select the preferred delivery method, e.g., Courier, Pathao, RedX, Steadfast. This affects delivery time and cost."
                as="select"
                required
                placeholder="Select delivery method"
                options={[
                  { label: "Courier", value: "courier" },
                  { label: "Pathao", value: "pathao" },
                  { label: "RedX", value: "redx" },
                  { label: "Steadfast", value: "steadfast" },
                ]}
                value={customerInfo.deliveryMethod}
                onChange={(val) => handleFieldChange("deliveryMethod", val)}
              />
              {touchedFields.deliveryMethod && !customerInfo.deliveryMethod && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  Delivery method is required
                </Text>
              )}
            </Col>
          </Row>

          <FormField
            name="notes"
            label="Order Notes"
            tooltip="Optional: Provide special instructions for delivery or any other notes related to the order."
            as="textarea"
            placeholder="Any special instructions or notes..."
            value={customerInfo.notes}
            onChange={(val) => handleFieldChange("notes", val)}
          />

          {!isExistingCustomer && emailError && (
            <Alert
              message="Duplicate Email Detected"
              description={
                <Space direction="vertical" size={0}>
                  <Text>{emailError}</Text>
                  <Text type="secondary">
                    Please use the existing customer option or a different email
                    address.
                  </Text>
                </Space>
              }
              type="error"
              showIcon
            />
          )}

          {!isExistingCustomer && !emailError && (
            <Alert
              message="Customer Record Creation"
              description={
                <Space direction="vertical" size={0}>
                  <Text>
                    A customer record will be created in the system with the
                    provided information.
                  </Text>
                  <Text type="secondary">
                    No password is required at this stage — the customer will
                    create their own password later.
                  </Text>
                </Space>
              }
              type="info"
              showIcon
            />
          )}

          {isExistingCustomer && customerInfo.customer_id && (
            <Alert
              message="Customer Information"
              description="This order is linked to an existing customer. Basic customer information is auto-filled. You can modify the delivery address and city for this specific order."
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>
    </Space>
  );
}
