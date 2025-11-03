/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Typography,
} from "antd";
import { CustomerInfo as CustomerInfoType } from "@/lib/types/order";
import { ShippingFee } from "@/lib/queries/stores/getStoreSettings";

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface CustomerInfoProps {
  customerInfo: CustomerInfoType;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfoType>>;
  orderId: string;
  isExistingCustomer?: boolean;
  shippingFees?: ShippingFee[];
  settingsLoading?: boolean;
}

export default function CustomerInfo({
  customerInfo,
  setCustomerInfo,
  orderId,
  isExistingCustomer = false,
  shippingFees = [],
  settingsLoading = false,
}: CustomerInfoProps) {
  const validatePhone = (phone: string) => {
    const phoneRegex = /^(?:\+88|01)?\d{9,11}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const isPhoneValid = customerInfo.phone
    ? validatePhone(customerInfo.phone)
    : true;

  const handleFieldChange = (field: keyof CustomerInfoType, value: any) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
  };

  // Set default password to "123456" when component mounts for new customers
  React.useEffect(() => {
    if (!isExistingCustomer && !customerInfo.password) {
      setCustomerInfo((prev) => ({ ...prev, password: "AdminCustomer1232*" }));
    }
  }, [isExistingCustomer, customerInfo.password, setCustomerInfo]);

  // Get selected shipping fee details with proper null checks
  const selectedShippingFee = React.useMemo(() => {
    if (!customerInfo.city || !Array.isArray(shippingFees)) return undefined;

    return shippingFees.find((fee) => {
      if (!fee || typeof fee !== "object" || !fee.location) return false;

      const feeLocation = String(fee.location)
        .toLowerCase()
        .replace(/\s+/g, "-");
      const customerCity = String(customerInfo.city).toLowerCase();

      return (
        feeLocation.includes(customerCity) || customerCity.includes(feeLocation)
      );
    });
  }, [customerInfo.city, shippingFees]);

  // Filter valid shipping fees with proper locations
  const validShippingFees = React.useMemo(() => {
    if (!Array.isArray(shippingFees)) return [];

    return shippingFees.filter(
      (fee) =>
        fee &&
        typeof fee === "object" &&
        fee.location &&
        typeof fee.location === "string" &&
        fee.location.trim() !== "" &&
        typeof fee.fee === "number"
    );
  }, [shippingFees]);

  console.log("Shipping Fees:", shippingFees); // Debug log
  console.log("Valid Shipping Fees:", validShippingFees); // Debug log

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Customer Information
            </Title>
            {isExistingCustomer && (
              <Tag color="blue" style={{ marginTop: "8px" }}>
                Existing Customer
              </Tag>
            )}
          </div>

          <Form layout="vertical">
            <Form.Item label="Order ID">
              <Input value={orderId} disabled size="large" />
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
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    size="large"
                    disabled={isExistingCustomer}
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
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    size="large"
                    disabled={isExistingCustomer}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Customer Phone"
                  required
                  validateStatus={
                    !isPhoneValid ? "error" : !customerInfo.phone ? "error" : ""
                  }
                  help={
                    !isPhoneValid
                      ? "Please enter a valid phone number"
                      : !customerInfo.phone
                      ? "Phone number is required"
                      : ""
                  }
                >
                  <Input
                    placeholder="017********"
                    value={customerInfo.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    size="large"
                    disabled={isExistingCustomer}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                {!isExistingCustomer && (
                  <Form.Item label="Customer Password" required>
                    <Input.Password
                      value="AdminCustomer1232*"
                      disabled
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
                onChange={(e) => handleFieldChange("address", e.target.value)}
                rows={3}
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
                    placeholder={
                      settingsLoading
                        ? "Loading shipping options..."
                        : "Select city"
                    }
                    value={customerInfo.city || undefined}
                    onChange={(value) => handleFieldChange("city", value)}
                    size="large"
                    loading={settingsLoading}
                    disabled={settingsLoading}
                  >
                    {validShippingFees.map((fee) => (
                      <Option
                        key={fee.location}
                        value={fee.location.toLowerCase().replace(/\s+/g, "-")}
                      >
                        <Space>
                          <span>{fee.location}</span>
                          <Tag color="blue">৳{fee.fee}</Tag>
                        </Space>
                      </Option>
                    ))}

                    {validShippingFees.length === 0 && !settingsLoading && (
                      <Option disabled value="no-options">
                        No shipping options configured
                      </Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Delivery Method"
                  required
                  validateStatus={!customerInfo.deliveryMethod ? "error" : ""}
                  help={
                    !customerInfo.deliveryMethod
                      ? "Delivery method is required"
                      : ""
                  }
                >
                  <Select
                    placeholder="Select delivery method"
                    value={customerInfo.deliveryMethod || undefined}
                    onChange={(value) =>
                      handleFieldChange("deliveryMethod", value)
                    }
                    size="large"
                  >
                    <Option value="courier">Courier</Option>
                    <Option value="pathao">Pathao</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Order Notes">
              <TextArea
                placeholder="Any special instructions or notes..."
                value={customerInfo.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                rows={2}
              />
            </Form.Item>
          </Form>

          {!isExistingCustomer && (
            <Alert
              message="Customer Account Creation"
              description={
                <Space direction="vertical" size={0}>
                  <Text>
                    A customer account will be created with the provided
                    information.
                  </Text>
                  <Text>
                    Default password is set to:{" "}
                    <Text strong>AdminCustomer1232*</Text>
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
