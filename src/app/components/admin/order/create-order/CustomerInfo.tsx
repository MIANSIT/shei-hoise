/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/admin/order/create-order/CustomerInfo.tsx
"use client";
import React from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Row,
  Col,
  Tag,
  Alert,
  Space,
  Typography
} from "antd";
import { CustomerInfo as CustomerInfoType } from "@/lib/types/order";

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface CustomerInfoProps {
  customerInfo: CustomerInfoType;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfoType>>;
  orderId: string;
  isExistingCustomer?: boolean;
}

export default function CustomerInfo({ 
  customerInfo, 
  setCustomerInfo, 
  orderId,
  isExistingCustomer = false 
}: CustomerInfoProps) {
  const validatePhone = (phone: string) => {
    const phoneRegex = /^(?:\+88|01)?\d{9,11}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validatePassword = (password: string) => {
    return password && password.length >= 6;
  };

  const isPhoneValid = customerInfo.phone ? validatePhone(customerInfo.phone) : true;
  const isPasswordValid = customerInfo.password ? validatePassword(customerInfo.password) : true;

  const handleFieldChange = (field: keyof CustomerInfoType, value: any) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  // Generate a random password when component mounts for new customers
  React.useEffect(() => {
    if (!isExistingCustomer && !customerInfo.password) {
      const randomPassword = Math.random().toString(36).slice(-8) + 'A1!';
      setCustomerInfo(prev => ({ ...prev, password: randomPassword }));
    }
  }, [isExistingCustomer, customerInfo.password, setCustomerInfo]);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Customer Information
            </Title>
            {isExistingCustomer && (
              <Tag color="blue" style={{ marginTop: '8px' }}>
                Existing Customer
              </Tag>
            )}
          </div>

          <Form layout="vertical">
            <Form.Item label="Order ID">
              <Input 
                value={orderId} 
                disabled 
                size="large"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item 
                  label="Customer Name" 
                  required
                  validateStatus={!customerInfo.name ? "error" : ""}
                  help={!customerInfo.name ? "Customer name is required" : ""}
                >
                  <Input
                    placeholder="Enter customer name"
                    value={customerInfo.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    size="large"
                    disabled={isExistingCustomer} // Keep name disabled for existing customers
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item 
                  label="Customer Email" 
                  required
                  validateStatus={!customerInfo.email ? "error" : ""}
                  help={!customerInfo.email ? "Email is required" : ""}
                >
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerInfo.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    size="large"
                    disabled={isExistingCustomer} // Keep email disabled for existing customers
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item 
                  label="Customer Phone" 
                  required
                  validateStatus={!isPhoneValid ? "error" : !customerInfo.phone ? "error" : ""}
                  help={!isPhoneValid ? "Please enter a valid phone number" : !customerInfo.phone ? "Phone number is required" : ""}
                >
                  <Input
                    placeholder="017********"
                    value={customerInfo.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    size="large"
                    disabled={isExistingCustomer} // Keep phone disabled for existing customers
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                {!isExistingCustomer && (
                  <Form.Item 
                    label="Customer Password" 
                    required
                    validateStatus={!isPasswordValid ? "error" : ""}
                    help={!isPasswordValid ? "Password must be at least 6 characters" : "Auto-generated password. Customer can reset later."}
                  >
                    <Input.Password
                      placeholder="Enter password"
                      value={customerInfo.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      size="large"
                    />
                  </Form.Item>
                )}
              </Col>
            </Row>

            <Form.Item 
              label="Customer Address" 
              required
              validateStatus={!customerInfo.address ? "error" : ""}
              help={!customerInfo.address ? "Address is required" : ""}
            >
              <TextArea
                placeholder="Enter complete address"
                value={customerInfo.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                rows={3}
                // REMOVED: disabled={isExistingCustomer} - Address should be editable
              />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item 
                  label="City" 
                  required
                  validateStatus={!customerInfo.city ? "error" : ""}
                  help={!customerInfo.city ? "City is required" : ""}
                >
                  <Select
                    placeholder="Select city"
                    value={customerInfo.city || undefined}
                    onChange={(value) => handleFieldChange('city', value)}
                    size="large"
                    // REMOVED: disabled={isExistingCustomer} - City should be editable
                  >
                    <Option value="inside-dhaka">Inside Dhaka</Option>
                    <Option value="outside-dhaka">Outside Dhaka</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item 
                  label="Delivery Method" 
                  required
                  validateStatus={!customerInfo.deliveryMethod ? "error" : ""}
                  help={!customerInfo.deliveryMethod ? "Delivery method is required" : ""}
                >
                  <Select
                    placeholder="Select delivery method"
                    value={customerInfo.deliveryMethod || undefined}
                    onChange={(value) => handleFieldChange('deliveryMethod', value)}
                    size="large"
                  >
                    <Option value="courier">Courier</Option>
                    <Option value="pickup">Pickup</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Order Notes">
              <TextArea
                placeholder="Any special instructions or notes..."
                value={customerInfo.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                rows={2}
              />
            </Form.Item>
          </Form>

          {!isExistingCustomer && customerInfo.password && (
            <Alert
              message="Customer Account Creation"
              description={
                <Space direction="vertical">
                  <Text>A customer account will be created with the provided information.</Text>
                  <Text strong>Password: {customerInfo.password}</Text>
                  <Text type="secondary">The customer can reset their password later if needed.</Text>
                </Space>
              }
              type="info"
              showIcon
            />
          )}

          {isExistingCustomer && customerInfo.customer_id && (
            <Alert
              message="Customer Information"
              description={
                <Space direction="vertical">
                  <Text>This order is linked to an existing customer. Basic customer information is auto-filled.</Text>
                  <Text type="secondary">You can modify the delivery address and city for this specific order.</Text>
                </Space>
              }
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>
    </Space>
  );
}