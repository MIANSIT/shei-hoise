// app/components/admin/customers/CustomerStats.tsx
import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import {
  TeamOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  UserOutlined,
} from "@ant-design/icons";

interface CustomerStatsProps {
  totalCustomers: number;
  activeCustomersOrders: number; // customers with orders
  activeCustomersStatus: number; // customers with status === "active"
  thisMonth: number;
}

export function CustomerStats({
  totalCustomers,
  activeCustomersOrders,
  activeCustomersStatus,
  thisMonth,
}: CustomerStatsProps) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="Total Customers"
            value={totalCustomers}
            prefix={<TeamOutlined />}
            styles={{
              content: {
                color: "#1890ff", // now applied here
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="Active Customers (From Orders)"
            value={activeCustomersOrders}
            prefix={<CheckCircleOutlined />}
            styles={{
              content: {
                color: "#52c41a", // now applied here
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="Active Customers (From Status)"
            value={activeCustomersStatus}
            prefix={<UserOutlined />}
            styles={{
              content: {
                color: "#faad14", // now applied here
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="This Month"
            value={thisMonth}
            prefix={<RiseOutlined />}
            styles={{
              content: {
                color: "#722ed1", // now applied here
              },
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
