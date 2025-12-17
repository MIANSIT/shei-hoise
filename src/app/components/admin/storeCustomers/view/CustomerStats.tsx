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
            valueStyle={{ color: "#1890ff" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="Active Customers (Orders)"
            value={activeCustomersOrders}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="Active Customers (Status)"
            value={activeCustomersStatus}
            prefix={<UserOutlined />}
            valueStyle={{ color: "#faad14" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={6}>
        <Card>
          <Statistic
            title="This Month"
            value={thisMonth}
            prefix={<RiseOutlined />}
            valueStyle={{ color: "#722ed1" }}
          />
        </Card>
      </Col>
    </Row>
  );
}
