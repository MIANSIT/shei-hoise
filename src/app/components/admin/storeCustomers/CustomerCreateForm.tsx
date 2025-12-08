"use client";
import React from "react";
import {
  Card,
  Form,
  Input,
  Row,
  Col,
  Alert,
  Space,
  Typography,
  Button,
  App,
  Spin,
} from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import dataService from "@/lib/queries/dataService";
import type { CreateCustomerResponse } from "@/lib/types/customer";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CustomerCreateFormProps {
  onCustomerCreated?: (customer: CreateCustomerResponse) => void;
  showSuccessMessage?: boolean;
  buttonText?: string;
  compact?: boolean;
  resetKey?: number;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country?: string;
  notes?: string;
}

export default function CustomerCreateForm({
  onCustomerCreated,
  showSuccessMessage = true,
  buttonText = "Create Customer",
  compact = false,
  resetKey,
}: CustomerCreateFormProps) {
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const { user, loading: userLoading } = useCurrentUser();

  React.useEffect(() => {
    if (resetKey) {
      form.resetFields();
    }
  }, [resetKey, form]);

  const validatePhone = (phone: string) => {
    const phoneRegex = /^(?:\+88|01)?\d{9,11}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const onFinish = async (values: CustomerFormData) => {
    if (!user?.store_id) {
      notification.error({
        message: "Store ID Required",
        description: "Store ID is required to create customer",
      });
      return;
    }

    setLoading(true);
    try {
      const customerData = {
        store_id: user.store_id,
        first_name: values.name,
        email: values.email,
        phone: values.phone,
        address_line_1: values.address,
        city: values.city,
        postal_code: values.postal_code,
        country: values.country || "Bangladesh", // default country
      };

      const newCustomer = await dataService.createCustomer(customerData);

      if (showSuccessMessage) {
        notification.success({
          message: "Customer Created Successfully",
          description: `Customer ${values.name} has been created successfully`,
        });
      }

      form.resetFields();

      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }
    } catch (error: unknown) {
      console.error("Error creating customer:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Please check the information and try again";

      notification.error({
        message: "Failed to Create Customer",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card className={compact ? "compact-form" : ""}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {!compact && (
          <Title level={4} style={{ margin: 0 }}>
            Create New Customer
          </Title>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
          initialValues={{ country: "Bangladesh" }} // default country
        >
          <Row gutter={16}>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="name"
                label="Customer Name"
                rules={[
                  { required: true, message: "Customer name is required" },
                ]}
              >
                <Input
                  placeholder="Enter customer name"
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="email"
                label="Customer Email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  placeholder="customer@example.com"
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="phone"
                label="Customer Phone"
                rules={[
                  { required: true, message: "Phone number is required" },
                  {
                    validator: (_, value) => {
                      if (!value)
                        return Promise.reject(
                          new Error("Phone number is required")
                        );
                      if (!validatePhone(value))
                        return Promise.reject(
                          new Error(
                            "Please enter a valid Bangladeshi phone number"
                          )
                        );
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="017********"
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="city"
                label="City"
                rules={[{ required: true, message: "City is required" }]}
              >
                <Input
                  placeholder="Enter city (e.g., Dhaka, Chittagong)"
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Customer Address"
            rules={[{ required: true, message: "Address is required" }]}
          >
            <TextArea
              placeholder="Enter complete address"
              rows={3}
              disabled={loading}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="postal_code"
                label="Postal Code"
                rules={[{ required: true, message: "Postal code is required" }]}
              >
                <Input
                  placeholder="Enter postal code (e.g., 1200)"
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item name="country" label="Country">
                <Input placeholder="Country" size="large" disabled={loading} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes (Optional)">
            <Input
              placeholder="Any additional notes..."
              size="large"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block={compact}
              style={!compact ? { width: "200px" } : {}}
            >
              {buttonText}
            </Button>
          </Form.Item>
        </Form>

        <Alert
          message="Customer Account Creation"
          description={
            <Space direction="vertical" size={0}>
              <Text>
                The admin will create the customer account without a password.
              </Text>
              <Text>
                The customer will receive an email/letter to generate their own
                password.
              </Text>
              <Text type="secondary">
                Customer can update their information later.
              </Text>
            </Space>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
}
