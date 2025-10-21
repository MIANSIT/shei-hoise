/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/admin/order/create-order/OrderSummary.tsx
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
  Statistic
} from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { OrderProduct } from "@/lib/types/order";

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
  status: "pending" | "confirmed" | "completed" | "cancelled";
  setStatus: (status: "pending" | "confirmed" | "completed" | "cancelled") => void;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  setPaymentStatus: (status: "pending" | "paid" | "failed" | "refunded") => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
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
}: OrderSummaryProps) {
  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>Order Summary</Title>

        {/* Order Totals */}
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Text>Subtotal:</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
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
                    style={{ width: '100%' }}
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
                    style={{ width: '100%' }}
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
                    onChange={(value) => setDeliveryCost(value || 0)}
                    style={{ width: '100%' }}
                    addonAfter="৳"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Total Amount:</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                ৳{totalAmount.toFixed(2)}
              </Text>
            </Col>
          </Row>
        </Space>

        <Divider />

        {/* Order Status & Payment */}
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Order Status">
                <Select
                  value={status}
                  onChange={(value: any) => setStatus(value)}
                  style={{ width: '100%' }}
                  size="large"
                >
                  <Option value="pending">Pending</Option>
                  <Option value="confirmed">Confirmed</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Payment Status">
                <Select
                  value={paymentStatus}
                  onChange={(value: any) => setPaymentStatus(value)}
                  style={{ width: '100%' }}
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
              style={{ width: '100%' }}
              size="large"
              placeholder="Select payment method"
            >
              <Option value="cash">Cash on Delivery</Option>
              <Option value="card">Credit/Debit Card</Option>
              <Option value="bkash">bKash</Option>
              <Option value="nagad">Nagad</Option>
              <Option value="bank">Bank Transfer</Option>
            </Select>
          </Form.Item>
        </Space>

        {/* Quick Stats */}
        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Statistic
                title="Items"
                value={orderProducts.reduce((sum, item) => sum + item.quantity, 0)}
                prefix={<ShoppingCartOutlined />}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="Products"
                value={orderProducts.length}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
}