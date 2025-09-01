"use client";

import React, { useState } from "react";
import { Table, Avatar, Space, Tooltip, Input } from "antd";
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
  const [searchOrderId, setSearchOrderId] = useState<string>("");

  // Filter orders by Order ID
  const filteredOrders = orders.filter((order) =>
    order.id.toString().includes(searchOrderId)
  );

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
        const fullAddress = `${order.user.address || ""}${
          order.user.city ? ", " + order.user.city : ""
        }${order.user.country ? ", " + order.user.country : ""}`.trim() || "Not Provided";
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
        return <span>${total.toFixed(2)}</span>;
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
    <div>
      {/* Filter input above the table */}
      <div className="flex justify-end mb-4">
        <Input
          placeholder="Search by Order ID"
          value={searchOrderId}
          onChange={(e) => setSearchOrderId(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
      </div>

      <Table<Order>
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        expandable={{
          expandedRowRender: (order) => (
            <div className="space-y-6">
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
              <DetailedOrderView order={order} />
            </div>
          ),
        }}
      />
    </div>
  );
};

export default OrdersTable;
