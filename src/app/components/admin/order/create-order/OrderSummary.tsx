/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { OrderProduct } from "@/lib/types/order";
import { ShippingFee } from "@/lib/queries/stores/getStoreSettings";
import { useState, useEffect } from "react";

const { Option } = Select;
const { Title, Text } = Typography;

interface OrderSummaryProps {
  orderProducts: OrderProduct[];
  subtotal: number;
  taxAmount: number;
  setTaxAmount: (amount: number) => void;
  discount: number;
  setDiscount: (discount: number) => void;
  deliveryCost: number;
  setDeliveryCost: (cost: number) => void;
  totalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "shipped";
  setStatus: (
    status: "pending" | "confirmed" | "completed" | "cancelled" | "shipped"
  ) => void;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  setPaymentStatus: (
    status: "pending" | "paid" | "failed" | "refunded"
  ) => void;
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

  // Get selected shipping fee details
  const selectedShippingFee = shippingFees.find((fee) => {
    if (!fee || typeof fee !== "object" || !fee.name || !customerDeliveryOption)
      return false;

    const feeName = String(fee.name).toLowerCase().replace(/\s+/g, "-");
    const customerDeliveryOptionNormalized = String(
      customerDeliveryOption
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
    if (!isCustomDelivery) return; // Only allow changes for custom delivery

    const newCost = value || 0;
    setDeliveryCost(newCost);

    // Check if this is a manual change (different from the auto-calculated fee)
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

  return (
    <Card
      styles={{
        body: {
          padding: "10px",
        },
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>
          Order Summary
        </Title>

        {/* Shipping Fee Alert */}
        {displayShippingFee && customerDeliveryOption && !isCustomDelivery && (
          <Alert
            message={
              isManualDeliveryCost
                ? "Custom Shipping Fee"
                : "Shipping Fee Applied"
            }
            description={
              <Space direction="vertical" size={0}>
                <Text>
                  <strong>{displayShippingFee.name}</strong>: ৳
                  {displayShippingFee.price}
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
            message="Custom Delivery Fee"
            description={
              <Space direction="vertical" size={0}>
                <Text>
                  <strong>Custom Delivery</strong>: ৳{deliveryCost}
                </Text>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  You can manually adjust the delivery cost for custom delivery
                  Price
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />
        )}

        {/* Order Totals */}
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Text>Subtotal:</Text>
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text strong>৳{subtotal.toFixed(2)}</Text>
            </Col>
          </Row>

          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Tax Amount (BDT)">
                  <InputNumber
                    min={0}
                    value={taxAmount}
                    onChange={(value) => setTaxAmount(value || 0)}
                    style={{ width: "100%" }}
                    addonAfter="৳"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Discount Amount (BDT)">
                  <InputNumber
                    min={0}
                    max={subtotal}
                    value={discount}
                    onChange={(value) => setDiscount(value || 0)}
                    style={{ width: "100%" }}
                    addonAfter="৳"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Delivery Cost (BDT)">
                  <InputNumber
                    min={0}
                    value={deliveryCost}
                    onChange={handleDeliveryCostChange}
                    style={{ width: "100%" }}
                    addonAfter="৳"
                    disabled={!isCustomDelivery}
                    readOnly={!isCustomDelivery}
                  />
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
                ৳{totalAmount.toFixed(2)}
              </Text>
            </Col>
          </Row>
        </Space>

        <Divider />

        {/* Order Status & Payment */}
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Order Status">
                <Select
                  value={status}
                  onChange={(value: any) => setStatus(value)}
                  style={{ width: "100%" }}
                  size="large"
                >
                  <Option value="pending">Pending</Option>
                  <Option value="confirmed">Confirmed</Option>
                  <Option value="completed">Delivered</Option>
                  <Option value="shipped">Shipped</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Payment Status">
                <Select
                  value={paymentStatus}
                  onChange={(value: any) => setPaymentStatus(value)}
                  style={{ width: "100%" }}
                  size="large"
                >
                  <Option value="pending">Pending</Option>
                  <Option value="paid">Paid</Option>
                  <Option value="failed">Failed</Option>
                  <Option value="refunded">Refunded</Option>
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
              <Option value="cod">Cash on Delivery</Option>
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
                  0
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
