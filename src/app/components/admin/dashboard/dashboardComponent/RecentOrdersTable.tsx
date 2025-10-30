"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import { Order } from "@/lib/hook/useDashboardData";
import MobileOrderCard from "./MobileOrderCard";

const { Text } = Typography;

interface RecentOrdersTableProps {
  orders: Order[];
  title?: string;
}

const colorMap: Record<string, string> = {
  Completed: "green",
  Pending: "orange",
  Shipped: "blue",
};

const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  title = "Recent Orders",
}) => {
  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card
          title={title}
          className="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <Table
            dataSource={orders}
            rowKey="id"
            pagination={false}
            columns={[
              { title: "Order ID", dataIndex: "id" },
              { title: "Customer", dataIndex: "customer" },
              { title: "Total", dataIndex: "total" },
              {
                title: "Status",
                dataIndex: "status",
                render: (status: string) => (
                  <Text style={{ color: colorMap[status], fontWeight: 500 }}>
                    {status}
                  </Text>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <MobileOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
};

export default RecentOrdersTable;
