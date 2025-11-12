// app/components/admin/customers/CustomerStats.tsx
import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import {
  TeamOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from "@ant-design/icons";

interface CustomerStatsProps {
  totalCustomers: number;
  activeCustomers: number;
}

export function CustomerStats({
  totalCustomers,
  activeCustomers,
}: CustomerStatsProps) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Customers"
            value={totalCustomers}
            prefix={<TeamOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Active Customers"
            value={activeCustomers}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="This Month"
            value={totalCustomers}
            prefix={<RiseOutlined />}
            valueStyle={{ color: "#722ed1" }}
          />
        </Card>
      </Col>
    </Row>
  );
}
