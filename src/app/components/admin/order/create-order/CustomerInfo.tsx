/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Card, Row, Col, Space, Typography, Alert, Button } from "antd";
import { CustomerInfo as CustomerInfoType } from "@/lib/types/order";
import type { ShippingFee } from "@/lib/types/store/store";
import FormField from "@/app/components/admin/dashboard/products/addProducts/FormField";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

const { Title, Text } = Typography;

interface PhoneDeliveryStats {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  resolvedOrders: number;
  successRate: number;
  storeCount: number;
  level: "new" | "low" | "medium" | "high";
}

type DeliveryHistoryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; stats: PhoneDeliveryStats | null };

const RATING_STYLE: Record<
  PhoneDeliveryStats["level"],
  { bg: string; text: string }
> = {
  new: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300" },
  low: { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-400" },
  medium: { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-400" },
  high: { bg: "bg-red-100 dark:bg-red-950/60", text: "text-red-700 dark:text-red-400" },
};

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
  const n = useLocalNum();

  const validatePhone = (phone: string) => {
    const phoneRegex = /^(?:\+88|01)?\d{9,11}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const [touchedFields, setTouchedFields] = React.useState<
    Partial<Record<keyof CustomerInfoType, boolean>>
  >({});

  // Keyed by the phone number it was fetched for — switching the phone field
  // after a check invalidates the old result instead of leaving a stale
  // panel showing another customer's history under the new number.
  const [historyState, setHistoryState] = React.useState<DeliveryHistoryState>({
    status: "idle",
  });
  const [historyPhone, setHistoryPhone] = React.useState<string | null>(null);

  const checkDeliveryHistory = async () => {
    const phone = customerInfo.phone.trim();
    if (!validatePhone(phone)) return;

    setHistoryState({ status: "loading" });
    setHistoryPhone(phone);
    try {
      const res = await fetch("/api/orders/delivery-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setHistoryState({ status: "done", stats: data.stats ?? null });
    } catch {
      setHistoryState({ status: "error" });
    }
  };

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
              {validatePhone(customerInfo.phone) && (
                <div style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    onClick={checkDeliveryHistory}
                    loading={historyState.status === "loading"}
                  >
                    {historyState.status === "loading"
                      ? t.admin.checkDeliveryHistoryChecking
                      : t.admin.checkDeliveryHistoryButton}
                  </Button>

                  {historyState.status === "error" &&
                    historyPhone === customerInfo.phone.trim() && (
                      <Alert
                        style={{ marginTop: 8 }}
                        type="error"
                        showIcon
                        description={t.admin.checkDeliveryHistoryError}
                      />
                    )}

                  {historyState.status === "done" &&
                    historyPhone === customerInfo.phone.trim() && (
                      <div
                        style={{ marginTop: 8 }}
                        className="rounded-lg border border-border/60 bg-card/50 p-3"
                      >
                        {historyState.stats === null ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t.admin.checkDeliveryHistoryNewCustomer}
                          </Text>
                        ) : (
                          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                            <Text strong style={{ fontSize: 13 }}>
                              {t.admin.checkDeliveryHistoryTitle}
                            </Text>
                            <div className="flex justify-between text-[13px]">
                              <span>{t.admin.checkDeliveryHistoryTotal}</span>
                              <span>{n(historyState.stats.totalOrders)}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                              <span>{t.admin.checkDeliveryHistorySuccessful}</span>
                              <span>{n(historyState.stats.deliveredOrders)}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                              <span>{t.admin.checkDeliveryHistoryRate}</span>
                              <span>
                                {historyState.stats.resolvedOrders > 0
                                  ? `${n(historyState.stats.successRate)}%`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[13px]">
                              <span>{t.admin.checkDeliveryHistoryRating}</span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                                  RATING_STYLE[historyState.stats.level].bg
                                } ${RATING_STYLE[historyState.stats.level].text}`}
                              >
                                {historyState.stats.level === "new"
                                  ? t.admin.checkDeliveryHistoryRatingNew
                                  : historyState.stats.level === "low"
                                    ? t.admin.checkDeliveryHistoryRatingLow
                                    : historyState.stats.level === "medium"
                                      ? t.admin.checkDeliveryHistoryRatingMedium
                                      : t.admin.checkDeliveryHistoryRatingHigh}
                              </span>
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {t.admin.checkDeliveryHistoryScopeNote}
                            </Text>
                          </Space>
                        )}
                      </div>
                    )}
                </div>
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
