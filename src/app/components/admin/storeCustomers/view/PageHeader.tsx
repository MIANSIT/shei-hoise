// app/components/admin/customers/PageHeader.tsx
import React from "react";
import { Button, Typography, Divider } from "antd";
import { UserAddOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface PageHeaderProps {
  onAddCustomer: () => void;
}

export function PageHeader({ onAddCustomer }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Customers
          </Title>
          <Text type="secondary">
            Manage your customer information and details
          </Text>
        </div>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          size="large"
          onClick={onAddCustomer}
        >
          Add Customer
        </Button>
      </div>
      <Divider style={{ margin: "16px 0" }} />
    </div>
  );
}
