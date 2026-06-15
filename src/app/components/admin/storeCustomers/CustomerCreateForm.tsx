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
import { useTranslation } from "@/lib/hook/useTranslation";

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
  buttonText,
  compact = false,
  resetKey,
}: CustomerCreateFormProps) {
  const { notification } = App.useApp();
  const t = useTranslation();
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
        message: t.admin.customerStoreRequired,
        description: t.admin.customerStoreRequiredDesc,
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
        country: values.country || "Bangladesh",
      };

      const newCustomer = await dataService.createCustomer(customerData);

      if (showSuccessMessage) {
        notification.success({
          message: t.admin.customerCreatedMsg,
          description: `${values.name} ${t.admin.customerCreatedDesc2}`,
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
          : t.admin.customerCheckInfo;

      notification.error({
        message: t.admin.customerFailedMsg,
        description: errorMessage.includes("already exists")
          ? t.admin.customerEmailExists
          : errorMessage,
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
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {!compact && (
          <Title level={4} style={{ margin: 0 }}>
            {t.admin.customerCreateTitle}
          </Title>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
          initialValues={{ country: "Bangladesh" }}
        >
          <Row gutter={16}>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="name"
                label={t.admin.customerNameLabel}
                rules={[
                  { required: true, message: t.admin.customerNameRequired2 },
                ]}
              >
                <Input
                  placeholder={t.admin.customerNamePlaceholder}
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="email"
                label={t.admin.customerEmailLabel}
                rules={[
                  { required: true, message: t.admin.customerEmailRequired },
                  { type: "email", message: t.admin.customerValidEmail },
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
                label={t.admin.customerPhoneLabel}
                rules={[
                  { required: true, message: t.admin.customerPhoneRequired },
                  {
                    validator: (_, value) => {
                      if (!value)
                        return Promise.reject(
                          new Error(t.admin.customerPhoneRequired)
                        );
                      if (!validatePhone(value))
                        return Promise.reject(
                          new Error(t.admin.customerValidPhone)
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
                label={t.admin.customerCityLabel}
                rules={[{ required: true, message: t.admin.customerCityRequired }]}
              >
                <Input
                  placeholder={t.admin.customerCityPlaceholder}
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label={t.admin.customerAddressLabel}
            rules={[{ required: true, message: t.admin.customerAddressRequired }]}
          >
            <TextArea
              placeholder={t.admin.customerAddressPlaceholder}
              rows={3}
              disabled={loading}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item
                name="postal_code"
                label={t.admin.customerPostalLabel}
                rules={[{ required: true, message: t.admin.customerPostalRequired }]}
              >
                <Input
                  placeholder={t.admin.customerPostalPlaceholder}
                  size="large"
                  disabled={loading}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={compact ? 24 : 12}>
              <Form.Item name="country" label={t.admin.customerCountryLabel}>
                <Input placeholder={t.admin.customerCountryLabel} size="large" disabled={loading} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label={t.admin.customerNotesLabel}>
            <Input
              placeholder={t.admin.customerNotesPlaceholder}
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
              {buttonText ?? t.admin.customerCreateBtn}
            </Button>
          </Form.Item>
        </Form>

        <Alert
          title={t.admin.customerAccCreation}
          description={
            <Space orientation="vertical" size={0}>
              <Text>{t.admin.customerNoPassword}</Text>
              <Text>{t.admin.customerEmailInfo}</Text>
              <Text type="secondary">{t.admin.customerUpdateInfo}</Text>
            </Space>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
}
