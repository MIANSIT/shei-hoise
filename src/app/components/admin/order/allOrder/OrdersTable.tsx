"use client";

import React from "react";
import { Table, Avatar, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Order } from "@/lib/types/types";
import StatusTag from "./StatusTag";
import OrderProductTable from "./OrderProductTable";

interface Props {
  orders: Order[];
  onUpdate: (orderId: number, changes: Partial<Order>) => void;
}

const OrdersTable: React.FC<Props> = ({ orders, onUpdate }) => {
  const columns: ColumnsType<Order> = [
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
      title: "Total Price",
      key: "total",
      render: (_, order) => {
        const total = order.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
        const tooltipText = order.products.map((p) => `${p.title}: ${p.quantity}`).join(", ");
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
          <OrderProductTable
            order={order}
            onSaveStatus={(s) => onUpdate(order.id, { status: s })}
            onSavePaymentStatus={(s) => onUpdate(order.id, { paymentStatus: s })}
            onSaveDeliveryOption={(o) => onUpdate(order.id, { deliveryOption: o })}
            onSavePaymentMethod={(m) => onUpdate(order.id, { paymentMethod: m })}
          />
        ),
      }}
    />
  );
};

export default OrdersTable;
