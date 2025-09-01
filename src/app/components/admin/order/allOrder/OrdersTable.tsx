"use client";

import React from "react";
import { Table, Avatar, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Order } from "@/lib/types/types";
import StatusTag from "./StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "./DetailedOrderView";

interface Props {
  orders: Order[];
  onUpdate: (orderId: number, changes: Partial<Order>) => void;
}

const OrdersTable: React.FC<Props> = ({ orders, onUpdate }) => {
  const columns: ColumnsType<Order> = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      render: (id: number) => <span className="font-medium">#{id}</span>,
    },
    {
      title: "User Info",
      dataIndex: "user",
      key: "user",
      render: (user: Order["user"]) => (
        <Space>
          <Avatar src={user.avatar} />
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-gray-500 text-xs">{user.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Delivery Address",
      key: "address",
      render: (order: Order) => {
        const fullAddress = `${order.user.address || ""}${order.user.city ? ", " + order.user.city : ""}${order.user.country ? ", " + order.user.country : ""}`.trim() || "Not Provided";
        return (
          <Tooltip title={fullAddress}>
            <div className="truncate max-w-[150px]">{fullAddress}</div>
          </Tooltip>
        );
      },
    },
    {
      title: "Total Price",
      key: "total",
      render: (_, order) => {
        const total = order.products.reduce(
          (sum, p) => sum + p.price * p.quantity,
          0
        );
        const tooltipText = order.products
          .map((p) => `${p.title}: ${p.quantity}`)
          .join(", ");
        return (
          <Tooltip title={tooltipText}>
            <div className="truncate max-w-[120px]">${total.toFixed(2)}</div>
          </Tooltip>
        );
      },
    },
    {
      title: "Order Status",
      dataIndex: "status",
      key: "status",
      render: (status: Order["status"]) => <StatusTag status={status} />,
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (status: Order["paymentStatus"]) => <StatusTag status={status} />,
    },
    {
      title: "Order Date",
      dataIndex: "orderDate",
      key: "orderDate",
    },
  ];

  return (
    <Table<Order>
      columns={columns}
      dataSource={orders}
      rowKey="id"
      expandable={{
        expandedRowRender: (order) => (
          <div className="space-y-6">
            {/* Keep original OrderProductTable */}
            <OrderProductTable
              order={order}
              onSaveStatus={(s) => onUpdate(order.id, { status: s })}
              onSavePaymentStatus={(s) =>
                onUpdate(order.id, { paymentStatus: s })
              }
              onSaveDeliveryOption={(o) =>
                onUpdate(order.id, { deliveryOption: o })
              }
              onSavePaymentMethod={(m) =>
                onUpdate(order.id, { paymentMethod: m })
              }
            />

            {/* Modern DetailedOrderView */}
            <DetailedOrderView order={order} />
          </div>
        ),
      }}
    />
  );
};

export default OrdersTable;
