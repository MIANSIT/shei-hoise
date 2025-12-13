"use client";

import React from "react";
import StatCard from "./StatCard";
import OrderStatusCard from "./OrderStatusCard";
import { Row, Col, Typography, Card, Select } from "antd";
// import { Row, Col, Typography, Card, Button, Select } from "antd";
import InventoryAlertCard from "./InventoryAlertCard";
import OrderAmountCard from "./OrderAmountCard";
import SalesTrendChart from "./SalesTrendChart";
import TopProducts from "./TopProducts";
import CustomerSnapshot from "./CustomerSnapshot";
import AlertsSection from "./AlertsSection";
// import { EyeOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";

interface MainDashboardProps {
  stats: {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    change: string;
    changeType: "positive" | "negative" | "neutral";
  }[];
  orderStatusCards: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    textColor: string;
  }[];
  orderAmounts: {
    title: string;
    amount: number;
    color?: string;
    status?: "paid" | "pending" | "refunded";
  }[];
  inventoryAlerts: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    actionText: string;
  }[];
  salesTrend: { date: string; sales: number }[];
  topProducts: { name: string; revenue: number; quantity: number }[];
  customerStats: {
    title: string;
    value: string;
    icon: React.ReactNode;
    subValue?: string | React.ReactNode;
  }[];
  alerts: {
    type: "stock" | "order" | "payment";
    message: string;
    count: number;
  }[];
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({
  stats,
  orderStatusCards,
  orderAmounts,
  inventoryAlerts,
  salesTrend,
  topProducts,
  customerStats,
  alerts,
  timePeriod,
  onTimePeriodChange,
}) => {
  // Get readable time period label
  const getTimePeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "yearly":
        return "Yearly";
      default:
        return "Daily";
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <Title level={2}>Dashboard Overview</Title>
        <Text type="secondary">Key metrics and insights for your business</Text>
      </div>

      {/* Section 1: KPI Cards with Time Period Selector */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <Title level={4} className="m-0">
              Business Health
            </Title>
            <Text type="secondary">
              Showing {getTimePeriodLabel(timePeriod).toLowerCase()} performance
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Text type="secondary" className="whitespace-nowrap">
              Time Period:
            </Text>
            <Select
              value={timePeriod}
              onChange={onTimePeriodChange}
              style={{ width: 120 }}
              size="middle"
            >
              <Option value="daily">Today&apos;s</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          {stats.map((stat, idx) => (
            <Col key={idx} xs={24} sm={12} lg={6}>
              <StatCard {...stat} />
            </Col>
          ))}
        </Row>
      </div>

      <div className="mb-8">
        <Row gutter={[16, 16]}>
          {/* Left: Order Status */}
          <Col xs={24} lg={12}>
            <div className="mb-4">
              <Title level={4} className="m-0">
                Order Status
              </Title>
              <Text type="secondary">Current status of orders</Text>
            </div>
            <Row gutter={[16, 16]}>
              {orderStatusCards.map((card, idx) => (
                <Col key={idx} xs={24} sm={12} lg={12}>
                  <OrderStatusCard {...card} />
                </Col>
              ))}
            </Row>
          </Col>

          {/* Right: Order Amounts */}
          <Col xs={24} lg={12}>
            <div className="mb-4">
              <Title level={4} className="m-0">
                Order Payment
              </Title>
              <Text type="secondary">Financial summary</Text>
            </div>
            <Row gutter={[16, 16]}>
              {orderAmounts.map((card, idx) => (
                <Col key={idx} xs={24} sm={12} lg={12}>
                  <OrderAmountCard
                    title={card.title}
                    amount={card.amount}
                    status={card.status}
                  />
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </div>

      {/* Section 3: Inventory Alerts */}
      <div className="mb-8">
        <div className="mb-4">
          <Title level={4} className="m-0">
            Inventory Health
          </Title>
          <Text type="secondary">Overview of product stock</Text>
        </div>
        <Row gutter={[16, 16]}>
          {inventoryAlerts.map((alert, idx) => (
            <Col key={idx} xs={24} sm={12} md={8}>
              <InventoryAlertCard {...alert} />
            </Col>
          ))}
        </Row>
      </div>

      {/* Section 3: Sales Trend */}
      <div className="mb-8">
        <div className="mb-4">
          <Title level={4} className="m-0">
            Sales Trend
          </Title>
          <Text type="secondary">Last 30 days performance</Text>
        </div>
        <SalesTrendChart data={salesTrend} />
      </div>

      {/* Section 4: Top Products & Customer Snapshot */}
      <div className="mb-8">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="Top Products"
              // extra={
              //   <Button type="link" icon={<EyeOutlined />}>
              //     View All
              //   </Button>
              // }
              className="h-full"
            >
              <TopProducts products={topProducts} />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Customer Snapshot"
              // extra={
              //   <Button type="link" icon={<EyeOutlined />}>
              //     View Details
              //   </Button>
              // }
              className="h-full"
            >
              <CustomerSnapshot stats={customerStats} />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Section 5: Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <Title level={4} className="m-0">
              ⚠️ Attention Required
            </Title>
            <Text type="secondary">Issues needing immediate action</Text>
          </div>
          <AlertsSection alerts={alerts} />
        </div>
      )}
    </div>
  );
};

export default MainDashboard;
