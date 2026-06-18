"use client";
import {
  Card,
  Form,
  InputNumber,
  Select,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Statistic,
  Alert,
  Tooltip,
} from "antd";
import { InfoCircleOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { OrderProduct } from "@/lib/types/order";
import type { ShippingFee } from "@/lib/types/store/store";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import { useState, useEffect } from "react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

const { Option } = Select;
const { Title, Text } = Typography;

const EditedBadge = () => (
  <span className="ml-1.5 rounded border border-amber-300 bg-amber-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
    Edited
  </span>
);

interface OrderSummaryDirtyFields {
  taxAmount?: boolean;
  discount?: boolean;
  additionalCharges?: boolean;
  deliveryCost?: boolean;
  status?: boolean;
  paymentStatus?: boolean;
  paymentMethod?: boolean;
}

interface OrderSummaryProps {
  orderProducts: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  setTaxAmount: (amount: number) => void;
  discount: number;
  setDiscount: (discount: number) => void;
  additionalCharges: number;
  setAdditionalCharges: (charges: number) => void;
  deliveryCost: number;
  setDeliveryCost: (cost: number) => void;
  totalAmount: number;
  status: OrderStatus;
  setStatus: (status: OrderStatus) => void;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (status: PaymentStatus) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  shippingFees?: ShippingFee[];
  customerDeliveryOption?: string;
  dirtyFields?: OrderSummaryDirtyFields;
}

export default function OrderSummary({
  orderProducts,
  subtotal,
  taxAmount,
  setTaxAmount,
  discount,
  setDiscount,
  additionalCharges,
  setAdditionalCharges,
  deliveryCost,
  setDeliveryCost,
  totalAmount,
  status,
  setStatus,
  paymentStatus,
  setPaymentStatus,
  paymentMethod,
  setPaymentMethod,
  shippingFees = [],
  customerDeliveryOption,
  dirtyFields = {},
}: OrderSummaryProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const [isManualDeliveryCost, setIsManualDeliveryCost] = useState(false);

  // Check if delivery option is custom
  const isCustomDelivery = customerDeliveryOption === "custom";

  const orderStatusOptions = [
    { value: OrderStatus.PENDING, label: t.admin.bulkPending },
    { value: OrderStatus.CONFIRMED, label: t.admin.bulkConfirmed },
    { value: OrderStatus.SHIPPED, label: t.admin.bulkShipped },
    { value: OrderStatus.DELIVERED, label: t.admin.bulkDelivered },
    { value: OrderStatus.CANCELLED, label: t.admin.bulkCancelled },
  ];

  const paymentStatusOptions = [
    { value: PaymentStatus.PENDING, label: t.admin.bulkPending },
    { value: PaymentStatus.PAID, label: t.admin.bulkPaid },
    { value: PaymentStatus.FAILED, label: t.admin.bulkFailed },
    { value: PaymentStatus.REFUNDED, label: t.admin.bulkRefunded },
  ];

  const paymentMethodOptions = [
    { value: "cod", label: "Cash on Delivery" },
    { value: "card", label: t.admin.orderPayCard },
    { value: "bkash", label: t.admin.orderPayBkash },
    { value: "nagad", label: t.admin.orderPayNagad },
  ];

  const {
    currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  // Get selected shipping fee details
  const selectedShippingFee = shippingFees.find((fee) => {
    if (!fee || typeof fee !== "object" || !fee.name || !customerDeliveryOption)
      return false;

    const feeName = String(fee.name).toLowerCase().replace(/\s+/g, "-");
    const customerDeliveryOptionNormalized = String(
      customerDeliveryOption,
    ).toLowerCase();
    return (
      feeName.includes(customerDeliveryOptionNormalized) ||
      customerDeliveryOptionNormalized.includes(feeName)
    );
  });

  // Auto-set delivery cost when customer delivery option changes (only for standard options)
  useEffect(() => {
    if (selectedShippingFee && !isManualDeliveryCost && !isCustomDelivery) {
      setDeliveryCost(selectedShippingFee.price);
    }
  }, [
    selectedShippingFee,
    isManualDeliveryCost,
    setDeliveryCost,
    isCustomDelivery,
  ]);

  // Handle manual delivery cost changes - only for custom delivery
  const handleDeliveryCostChange = (value: number | null) => {
    if (!isCustomDelivery) return;

    const newCost = value || 0;
    setDeliveryCost(newCost);

    if (selectedShippingFee && newCost !== selectedShippingFee.price) {
      setIsManualDeliveryCost(true);
    } else {
      setIsManualDeliveryCost(false);
    }
  };

  // Determine which shipping fee details to display
  const displayShippingFee = isManualDeliveryCost
    ? {
        name: t.admin.orderSummaryCustomShipping,
        price: deliveryCost,
        description: t.admin.orderSummaryCustomShippingDesc,
        estimated_days: selectedShippingFee?.estimated_days || undefined,
      }
    : selectedShippingFee;

  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  const displayCurrency = currencyLoading ? "" : (currency ?? "");

  return (
    <Card
      styles={{
        body: {
          padding: "10px",
        },
      }}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>
          {t.admin.orderSummaryTitle}
        </Title>

        {/* Shipping Fee Alert */}
        {displayShippingFee && customerDeliveryOption && !isCustomDelivery && (
          <Alert
            title={
              isManualDeliveryCost
                ? t.admin.orderSummaryCustomShipping
                : t.admin.orderSummaryShippingApplied
            }
            description={
              <Space orientation="vertical" size={0}>
                <Text>
                  <strong>{displayShippingFee.name}</strong>: (
                  {displayCurrencyIcon}){n(displayShippingFee.price)}
                </Text>
                {displayShippingFee.description && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {displayShippingFee.description}
                  </Text>
                )}
                {displayShippingFee.estimated_days && (
                  <Text
                    className="text-ring"
                    style={{ fontSize: "12px", display: "block" }}
                  >
                    📦 {t.admin.orderSummaryEstDelivery} {n(displayShippingFee.estimated_days)}{" "}
                    {displayShippingFee.estimated_days === 1 ? t.admin.orderSummaryDay : t.admin.orderSummaryDays}
                  </Text>
                )}
                {isManualDeliveryCost && (
                  <Text type="warning" style={{ fontSize: "12px" }}>
                    {t.admin.orderSummaryManualOverride}
                  </Text>
                )}
              </Space>
            }
            type={isManualDeliveryCost ? "warning" : "info"}
            showIcon
          />
        )}

        {/* Custom Delivery Alert */}
        {isCustomDelivery && (
          <Alert
            title={t.admin.orderSummaryCustomDelivery}
            description={
              <Space orientation="vertical" size={0}>
                <Text>
                  <strong>{t.admin.orderSummaryCustomDeliveryName}</strong>: ({displayCurrencyIcon})
                  {n(deliveryCost)}
                </Text>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  {t.admin.orderSummaryCustomAdjust}
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />
        )}

        {/* Order Totals */}
        <Space orientation="vertical" style={{ width: "100%" }} size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Text>{t.admin.orderSummarySubtotal}</Text>
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text strong>
                {n(subtotal.toFixed(2))} ({displayCurrencyIcon})
              </Text>
            </Col>
          </Row>

          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label={
                    <span className="flex items-center space-x-1">
                      <span>{t.admin.orderSummaryTaxAmount} ({displayCurrency})</span>
                      {dirtyFields.taxAmount && <EditedBadge />}
                      <Tooltip
                        title="Enter the tax amount to apply on the order. Ensure this aligns with local tax regulations."
                        placement="top"
                      >
                        <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                      </Tooltip>
                    </span>
                  }
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      value={taxAmount}
                      stringMode
                      onChange={(value) => {
                        const normalized =
                          value === null
                            ? 0
                            : Number(value.toString().replace(/^0+(?=\d)/, ""));
                        setTaxAmount(normalized);
                      }}
                    />

                    <span style={{ padding: "0 8px" }}>
                      {displayCurrencyIcon}
                    </span>
                  </Space.Compact>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label={
                    <span className="flex items-center space-x-1">
                      <span>{t.admin.orderSummaryDiscount} ({displayCurrency})</span>
                      {dirtyFields.discount && <EditedBadge />}
                      <Tooltip
                        title="Include any extra charges such as packaging, handling, or special services."
                        placement="top"
                      >
                        <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                      </Tooltip>
                    </span>
                  }
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      min={0}
                      max={subtotal}
                      value={discount}
                      onChange={(value) => setDiscount(value || 0)}
                      style={{ width: "100%" }}
                    />
                    <span style={{ padding: "0 8px" }}>
                      {displayCurrencyIcon}
                    </span>
                  </Space.Compact>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label={
                    <span className="flex items-center space-x-1">
                      <span>{t.admin.orderSummaryAdditional} ({displayCurrency})</span>
                      {dirtyFields.additionalCharges && <EditedBadge />}
                      <Tooltip
                        title="Include any extra charges such as packaging, handling, or special services."
                        placement="top"
                      >
                        <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                      </Tooltip>
                    </span>
                  }
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      min={0}
                      value={additionalCharges}
                      onChange={(value) => setAdditionalCharges(value || 0)}
                      style={{ width: "100%" }}
                      placeholder="Enter any additional charges"
                    />
                    <span style={{ padding: "0 8px" }}>
                      {displayCurrencyIcon}
                    </span>
                  </Space.Compact>
                </Form.Item>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  {t.admin.orderSummaryAdditionalDesc}
                </Text>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label={
                    <span className="flex items-center space-x-1">
                      <span>{t.admin.orderSummaryDeliveryCost} ({displayCurrency})</span>
                      {dirtyFields.deliveryCost && <EditedBadge />}
                      <Tooltip
                        title="Delivery cost is automatically calculated based on the selected delivery option. For custom delivery, you can manually adjust this value."
                        placement="top"
                      >
                        <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                      </Tooltip>
                    </span>
                  }
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      min={0}
                      value={deliveryCost}
                      onChange={handleDeliveryCostChange}
                      style={{ width: "100%" }}
                      disabled={!isCustomDelivery}
                      readOnly={!isCustomDelivery}
                    />
                    <span style={{ padding: "0 8px" }}>
                      {displayCurrencyIcon}
                    </span>
                    <Tooltip
                      title="Delivery cost is calculated based on the selected delivery option. For custom delivery, adjust manually if needed."
                      placement="top"
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-pointer p-2" />
                    </Tooltip>
                  </Space.Compact>
                </Form.Item>

                {customerDeliveryOption && !isCustomDelivery && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {t.admin.orderSummaryAutoSet}
                  </Text>
                )}
                {isCustomDelivery && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {t.admin.orderSummaryEnterCustom}
                  </Text>
                )}
                {isManualDeliveryCost && !isCustomDelivery && (
                  <Text type="warning" style={{ fontSize: "12px" }}>
                    {t.admin.orderSummaryManualOverride}
                  </Text>
                )}
              </Col>
            </Row>
          </Form>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Text strong>{t.admin.orderSummaryTotal}</Text>
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                ({displayCurrencyIcon}){""} {n(totalAmount.toFixed(2))}
              </Text>
            </Col>
          </Row>
        </Space>

        <Divider />

        {/* Order Status & Payment */}
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label={
                  <span className="flex items-center gap-1">
                    {t.admin.orderSummaryOrderStatus}
                    {dirtyFields.status && <EditedBadge />}
                  </span>
                }
              >
                <Select
                  value={status}
                  onChange={(value: OrderStatus) => setStatus(value)}
                  style={{ width: "100%" }}
                  size="large"
                >
                  {orderStatusOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={
                  <span className="flex items-center gap-1">
                    {t.admin.orderSummaryPaymentStatus}
                    {dirtyFields.paymentStatus && <EditedBadge />}
                  </span>
                }
              >
                <Select
                  value={paymentStatus}
                  onChange={(value: PaymentStatus) => setPaymentStatus(value)}
                  style={{ width: "100%" }}
                  size="large"
                >
                  {paymentStatusOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={
              <span className="flex items-center gap-1">
                {t.admin.orderSummaryPaymentMethod}
                {dirtyFields.paymentMethod && <EditedBadge />}
              </span>
            }
          >
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              style={{ width: "100%" }}
              size="large"
              placeholder="Select payment method"
            >
              {paymentMethodOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Space>

        {/* Quick Stats */}
        <Card size="small">
          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Statistic
                title={t.admin.orderSummaryItems}
                value={n(orderProducts.reduce((sum, item) => sum + item.quantity, 0))}
                prefix={<ShoppingCartOutlined />}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title={t.admin.orderSummaryProducts} value={n(orderProducts.length)} />
            </Col>
            {shippingFees.length > 0 && (
              <Col xs={12} md={6}>
                <Statistic title={t.admin.orderSummaryShippingZones} value={n(shippingFees.length)} />
              </Col>
            )}
          </Row>
        </Card>
      </Space>
    </Card>
  );
}
