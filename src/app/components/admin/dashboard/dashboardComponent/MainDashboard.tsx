"use client";

import React from "react";
import { Row, Col, Typography } from "antd";
import StatCard from "./StatCard";
import WeeklySalesChart from "./WeeklySalesChart";
import TopProducts from "./TopProducts";
import RecentOrdersTable from "./RecentOrdersTable";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Stat, ChartData, Product, Order } from "@/lib/hook/useDashboardData";

const { Title, Text } = Typography;

interface MainDashboardProps {
  stats: Stat[];
  chartData: ChartData[];
  topProducts: Product[];
  recentOrders: Order[];
  lowStockCount?: number;
}

const MainDashboard: React.FC<MainDashboardProps> = ({
  stats,
  chartData,
  topProducts,
  recentOrders,
  lowStockCount,
}) => {
  return (
    <div className="p-6 min-h-screen ">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Title level={2}>Welcome back</Title>
          <Text type="secondary">
            Here&apos;s what&apos;s happening with your store today.
          </Text>
        </div>
      </div>

      {/* Low Stock Highlight */}
      {lowStockCount && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md flex items-center gap-3">
          <ExclamationCircleOutlined className="text-2xl" />
          <span>
            Warning: You have <b>{lowStockCount}</b> products low in stock!
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <Row gutter={[16, 16]}>
        {stats.map((stat, idx) => (
          <Col key={idx} xs={24} sm={12} lg={6}>
            <StatCard {...stat} />
          </Col>
        ))}
      </Row>

      {/* Sales Chart & Top Products */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <WeeklySalesChart data={chartData} />
        </Col>
        <Col xs={24} lg={8}>
          <TopProducts products={topProducts} />
        </Col>
      </Row>

      {/* Recent Orders */}
      <div className="mt-6">
        <RecentOrdersTable orders={recentOrders} />
      </div>
    </div>
  );
};

export default MainDashboard;
