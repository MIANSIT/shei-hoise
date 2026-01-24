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

const { Option } = Select;
const { Title, Text } = Typography;

// Helper functions for dropdown options
const getOrderStatusOptions = () => {
  return [
    { value: OrderStatus.PENDING, label: "Pending" },
    { value: OrderStatus.CONFIRMED, label: "Confirmed" },
    { value: OrderStatus.SHIPPED, label: "Shipped" },
    { value: OrderStatus.DELIVERED, label: "Delivered" },
    { value: OrderStatus.CANCELLED, label: "Cancelled" },
  ];
};

const getPaymentStatusOptions = () => {
  return [
    { value: PaymentStatus.PENDING, label: "Pending" },
    { value: PaymentStatus.PAID, label: "Paid" },
    { value: PaymentStatus.FAILED, label: "Failed" },
    { value: PaymentStatus.REFUNDED, label: "Refunded" },
  ];
};

const getPaymentMethodOptions = () => {
  return [
    { value: "cod", label: "Cash on Delivery" },
    { value: "card", label: "Credit/Debit Card" },
    { value: "bkash", label: "bKash" },
    { value: "nagad", label: "Nagad" },
  ];
};

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
  status: OrderStatus; // ✅ Using enum
  setStatus: (status: OrderStatus) => void; // ✅ Using enum
  paymentStatus: PaymentStatus; // ✅ Using enum
  setPaymentStatus: (status: PaymentStatus) => void; // ✅ Using enum
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  shippingFees?: ShippingFee[];
  customerDeliveryOption?: string;
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
}: OrderSummaryProps) {
  const [isManualDeliveryCost, setIsManualDeliveryCost] = useState(false);

  // Check if delivery option is custom
  const isCustomDelivery = customerDeliveryOption === "custom";
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
        name: "Custom Shipping Fee",
        price: deliveryCost,
        description: "Manually adjusted shipping fee",
        estimated_days: selectedShippingFee?.estimated_days || "3-5",
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
          Order Summary
        </Title>

        {/* Shipping Fee Alert */}
        {displayShippingFee && customerDeliveryOption && !isCustomDelivery && (
          <Alert
            title={
              isManualDeliveryCost
                ? "Custom Shipping Fee"
                : "Shipping Fee Applied"
            }
            description={
              <Space orientation="vertical" size={0}>
                <Text>
                  <strong>{displayShippingFee.name}</strong>: (
                  {displayCurrencyIcon}){displayShippingFee.price}
                </Text>
                {displayShippingFee.description && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {displayShippingFee.description}
                  </Text>
                )}

                {isManualDeliveryCost && (
                  <Text type="warning" style={{ fontSize: "12px" }}>
                    Manual delivery cost override in effect
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
            title="Custom Delivery Fee"
            description={
              <Space orientation="vertical" size={0}>
                <Text>
                  <strong>Custom Delivery</strong>: ({displayCurrencyIcon})
                  {deliveryCost}
                </Text>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  You can manually adjust the delivery cost for custom delivery
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
              <Text>Subtotal:</Text>
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text strong>
                {subtotal.toFixed(2)} ({displayCurrencyIcon})
              </Text>
            </Col>
          </Row>

          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label={
                    <span className="flex items-center space-x-1">
                      <span>Tax Amount ({displayCurrency})</span>
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
                      <span>Discount Amount ({displayCurrency})</span>
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
                      <span>Additional Charges ({displayCurrency})</span>
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
                  Additional fees like packaging, handling, or special services
                </Text>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label={
                    <span className="flex items-center space-x-1">
                      <span>Delivery Cost ({displayCurrency})</span>
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
                    Delivery cost is automatically set based on selected
                    location
                  </Text>
                )}
                {isCustomDelivery && (
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Enter custom delivery cost for this order
                  </Text>
                )}
                {isManualDeliveryCost && !isCustomDelivery && (
                  <Text type="warning" style={{ fontSize: "12px" }}>
                    Manual delivery cost override in effect
                  </Text>
                )}
              </Col>
            </Row>
          </Form>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Total Amount:</Text>
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                ({displayCurrencyIcon}){""} {totalAmount.toFixed(2)}
              </Text>
            </Col>
          </Row>
        </Space>

        <Divider />

        {/* Order Status & Payment */}
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Order Status">
                <Select
                  value={status}
                  onChange={(value: OrderStatus) => setStatus(value)}
                  style={{ width: "100%" }}
                  size="large"
                >
                  {getOrderStatusOptions().map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Payment Status">
                <Select
                  value={paymentStatus}
                  onChange={(value: PaymentStatus) => setPaymentStatus(value)}
                  style={{ width: "100%" }}
                  size="large"
                >
                  {getPaymentStatusOptions().map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Payment Method">
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              style={{ width: "100%" }}
              size="large"
              placeholder="Select payment method"
            >
              {getPaymentMethodOptions().map((option) => (
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
                title="Items"
                value={orderProducts.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                )}
                prefix={<ShoppingCartOutlined />}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Products" value={orderProducts.length} />
            </Col>
            {shippingFees.length > 0 && (
              <Col xs={12} md={6}>
                <Statistic title="Shipping Zones" value={shippingFees.length} />
              </Col>
            )}
          </Row>
        </Card>
      </Space>
    </Card>
  );
}
