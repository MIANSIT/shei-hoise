/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Card, Row, Col, Space, Typography, Alert } from "antd";
import { CustomerInfo as CustomerInfoType } from "@/lib/types/order";
import type { ShippingFee } from "@/lib/types/store/store";
import FormField from "@/app/components/admin/dashboard/products/addProducts/FormField";
import { useTranslation } from "@/lib/hook/useTranslation";

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
  dirtyFields?: Partial<Record<keyof CustomerInfoType, boolean>>;
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
  dirtyFields = {},
}: CustomerInfoProps) {
  const t = useTranslation();

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
        typeof fee.price === "number",
    );
  }, [shippingFees]);

  const showPhoneError =
    touchedFields.phone &&
    (!customerInfo.phone || !validatePhone(customerInfo.phone));

  const showEmailError = touchedFields.email && emailError;

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {t.admin.createOrderCustInfoTitle}
            </Title>
            {isExistingCustomer && (
              <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                {t.admin.createOrderCustExistingLabel}
              </Text>
            )}
          </div>

          <FormField name="orderId" label={t.admin.createOrderFieldOrderId} value={orderId} readOnly />

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="name"
                label={t.admin.createOrderFieldCustName}
                placeholder={t.admin.createOrderFieldCustNamePH}
                required
                tooltip="Enter the full name of the customer as it appears on official documents or for delivery purposes."
                value={customerInfo.name}
                onChange={(val) => handleFieldChange("name", val)}
                isDirty={dirtyFields.name}
              />
              {touchedFields.name && !customerInfo.name && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {t.admin.createOrderErrName}
                </Text>
              )}
            </Col>
            <Col xs={24} md={12}>
              <FormField
                name="email"
                label={t.admin.createOrderFieldCustEmail}
                placeholder="customer@example.com"
                tooltip="Enter a valid email address. Used for order confirmation and communication. Optional field."
                value={customerInfo.email}
                onChange={(val) => handleFieldChange("email", val)}
                isDirty={dirtyFields.email}
              />
              {showEmailError && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {emailError}
                </Text>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="phone"
                label={t.admin.createOrderFieldCustPhone}
                placeholder="017********"
                required
                tooltip="Enter a valid phone number, e.g., 017XXXXXXXX. Include country code if necessary for international deliveries."
                value={customerInfo.phone}
                onChange={(val) => handleFieldChange("phone", val)}
                isDirty={dirtyFields.phone}
              />
              {showPhoneError && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {!customerInfo.phone
                    ? t.admin.createOrderErrPhone
                    : t.admin.createOrderErrPhoneInvalid}
                </Text>
              )}
            </Col>
            <Col xs={24} md={12}>
              <FormField
                name="city"
                label={t.admin.createOrderFieldCity}
                placeholder={t.admin.createOrderFieldCityPH}
                required
                tooltip="Enter the city where the order will be delivered, e.g., Dhaka, Chittagong."
                value={customerInfo.city}
                onChange={(val) => handleFieldChange("city", val)}
                isDirty={dirtyFields.city}
              />
              {touchedFields.city && !customerInfo.city && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {t.admin.createOrderErrCity}
                </Text>
              )}
            </Col>
          </Row>

          <FormField
            name="address"
            label={t.admin.createOrderFieldAddr}
            placeholder={t.admin.createOrderFieldAddrPH}
            as="textarea"
            required
            tooltip="Enter the complete delivery address including street, house number, and any landmarks to ensure accurate delivery."
            value={customerInfo.address}
            onChange={(val) => handleFieldChange("address", val)}
            isDirty={dirtyFields.address}
          />
          {touchedFields.address && !customerInfo.address && (
            <Text type="danger" style={{ fontSize: 12 }}>
              {t.admin.createOrderErrAddr}
            </Text>
          )}

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormField
                name="postal_code"
                tooltip="Provide the postal or ZIP code for the delivery address to assist with accurate shipping. Optional field."
                label={t.admin.createOrderFieldPostal}
                placeholder={t.admin.createOrderFieldPostalPH}
                value={customerInfo.postal_code || ""}
                onChange={(val) => handleFieldChange("postal_code", val)}
                isDirty={dirtyFields.postal_code}
              />
            </Col>
            <Col xs={24} md={12}>
              <FormField
                name="deliveryOption"
                label={t.admin.createOrderFieldDelivery}
                tooltip="Select the city-specific delivery option. This determines the shipping fees and available delivery partners."
                as="select"
                required
                placeholder={t.admin.createOrderFieldDeliveryPH}
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
                  {t.admin.createOrderErrDelivery}
                </Text>
              )}
            </Col>
          </Row>

          <FormField
            name="notes"
            label={t.admin.createOrderFieldNotes}
            tooltip="Optional: Provide special instructions for delivery or any other notes related to the order."
            as="textarea"
            placeholder={t.admin.createOrderFieldNotesPH}
            value={customerInfo.notes}
            onChange={(val) => handleFieldChange("notes", val)}
            isDirty={dirtyFields.notes}
          />

          {!isExistingCustomer && emailError && (
            <Alert
              title={t.admin.createOrderDuplicateEmail}
              description={
                <Space orientation="vertical" size={0}>
                  <Text>{emailError}</Text>
                  <Text type="secondary">
                    {t.admin.createOrderDuplicateEmailHint}
                  </Text>
                </Space>
              }
              type="error"
              showIcon
            />
          )}

          {!isExistingCustomer && !emailError && (
            <Alert
              title={t.admin.createOrderCustRecordTitle}
              description={
                <Space orientation="vertical" size={0}>
                  <Text>
                    {t.admin.createOrderCustRecordDesc}
                  </Text>
                  <Text type="secondary">
                    {t.admin.createOrderCustRecordNoPassword}
                  </Text>
                </Space>
              }
              type="info"
              showIcon
            />
          )}

          {isExistingCustomer && customerInfo.customer_id && (
            <Alert
              title={t.admin.createOrderExistLinkedTitle}
              description={t.admin.createOrderExistLinkedDesc}
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>
    </Space>
  );
}
