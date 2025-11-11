// app/components/admin/customers/CustomerDetailsModal.tsx
import React from "react";
import { Modal, Button, Row, Col, Space, Typography, Tag } from "antd";
import { EyeOutlined, EditOutlined, ShoppingOutlined } from "@ant-design/icons";
import { TableCustomer } from "@/lib/types/users";

const { Text } = Typography;

interface CustomerDetailsModalProps {
  visible: boolean;
  customer: TableCustomer | null;
  onClose: () => void;
  onEdit: (customer: TableCustomer) => void;
}

export function CustomerDetailsModal({
  visible,
  customer,
  onClose,
  onEdit,
}: CustomerDetailsModalProps) {
  const handleEdit = () => {
    if (customer) {
      onClose();
      onEdit(customer);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          Customer Details
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="edit"
          type="primary"
          icon={<EditOutlined />}
          onClick={handleEdit}
        >
          Edit Customer
        </Button>,
      ]}
      width={600}
    >
      {customer && (
        <div style={{ padding: "16px 0" }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>Name:</Text>
              <br />
              <Text>{customer.name}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Email:</Text>
              <br />
              <Text>{customer.email}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Phone:</Text>
              <br />
              <Text>{customer.phone || "N/A"}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Status:</Text>
              <br />
              <Text
                style={{
                  color: customer.status === "active" ? "#52c41a" : "#ff4d4f",
                  fontWeight: "bold",
                }}
              >
                {customer.status?.toUpperCase() || "ACTIVE"}
              </Text>
            </Col>
            {typeof customer.order_count === "number" &&
              customer.order_count > 0 && (
                <Col span={12}>
                  <Text strong>Total Orders:</Text>
                  <br />
                  <Tag color="blue">{customer.order_count} orders</Tag>
                </Col>
              )}
            {customer.source && (
              <Col span={12}>
                <Text strong>Source:</Text>
                <br />
                <Tag
                  icon={
                    customer.source === "orders" ? (
                      <ShoppingOutlined />
                    ) : undefined
                  }
                  color={customer.source === "orders" ? "blue" : "green"}
                >
                  {customer.source === "orders"
                    ? "From Orders"
                    : "Direct Customer"}
                </Tag>
              </Col>
            )}
            {customer.last_order_date && (
              <Col span={24}>
                <Text strong>Last Order Date:</Text>
                <br />
                <Text>
                  {new Date(customer.last_order_date).toLocaleDateString()}
                </Text>
              </Col>
            )}
            <Col span={24}>
              <Text strong>Address:</Text>
              <br />
              <Text>{customer.address || "N/A"}</Text>
            </Col>
          </Row>
        </div>
      )}
    </Modal>
  );
}
