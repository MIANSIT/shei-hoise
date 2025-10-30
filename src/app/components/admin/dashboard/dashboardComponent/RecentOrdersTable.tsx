"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import { Order } from "@/lib/hook/useDashboardData";
import MobileOrderCard from "./MobileOrderCard"; // default export

const { Text } = Typography;

interface RecentOrdersTableProps {
  orders: Order[];
  title?: string;
}

// Premium colors for statuses
const statusStyles: Record<
  string,
  { bg: string; text: string; hoverBg: string }
> = {
  Completed: {
    bg: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    text: "text-white",
    hoverBg: "hover:from-emerald-500 hover:to-emerald-700",
  },
  Pending: {
    bg: "bg-gradient-to-r from-amber-400 to-amber-600",
    text: "text-white",
    hoverBg: "hover:from-amber-500 hover:to-amber-700",
  },
  Shipped: {
    bg: "bg-gradient-to-r from-sky-400 to-sky-600",
    text: "text-white",
    hoverBg: "hover:from-sky-500 hover:to-sky-700",
  },
};

// Capitalize first letter
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  title = "Recent Orders",
}) => {
  // Sort orders by total descending (assuming total is a string like "$120")
  const parseTotal = (total: string) => Number(total.replace(/[^0-9.-]+/g, ""));
  const topOrders = [...orders]
    .sort((a, b) => parseTotal(b.total) - parseTotal(a.total))
    .slice(0, 3);

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card
          title={title}
          className="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <Table
            dataSource={topOrders}
            rowKey="id"
            pagination={false}
            columns={[
              { title: "Order ID", dataIndex: "id" },
              { title: "Customer", dataIndex: "customer" },
              { title: "Total", dataIndex: "total" },
              {
                title: "Status",
                dataIndex: "status",
                render: (status: string) => {
                  const style = statusStyles[capitalize(status)] || {
                    bg: "bg-gray-300",
                    text: "text-gray-900",
                    hoverBg: "",
                  };
                  return (
                    <span
                      className={`inline-block px-3 py-1 rounded-full font-semibold shadow-md transition-all duration-300 ${style.bg} ${style.text} ${style.hoverBg}`}
                    >
                      {capitalize(status)}
                    </span>
                  );
                },
              },
            ]}
          />
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="flex flex-col gap-4">
          {topOrders.map((order) => (
            <MobileOrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentOrdersTable;
